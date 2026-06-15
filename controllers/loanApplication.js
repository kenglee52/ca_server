const {PrismaClient,Prisma}=require("@prisma/client");
const {notifyDcoOnVerifierApprove}=require("../services/notifyDco");
const {notifyCeoOnDcoApprove}=require("../services/notifyCeo");
const {notifyVerifierOnSubmit}=require('../services/notifyVerifier')
const {notifyCreditOfficerOnCeoDecision}=require("../services/notifyCreditOfficer")
const prisma=new PrismaClient();

const ExcelJS=require('exceljs');
const toNumber=(v,def=null) => {
  if(v===undefined||v===null||v==="") return def;
  const n=Number(v);
  return Number.isFinite(n)? n:def;
};

const toDecimal=(v,def="0") => {
  const n=toNumber(v,null);
  if(n===null) return new Prisma.Decimal(def);
  return new Prisma.Decimal(n);
};

const normalizeStatusActive=(status) => {
  if(!status) return false;
  return String(status).toLowerCase()==="active";
};

async function writeAuditLog({tx,req,userId,action,entityType,entityId,oldValue,newValue,description}) {
  await tx.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      oldValue: oldValue??undefined,
      newValue: newValue??undefined,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      description,
    },
  });
}

function avgLastN(values,n=6) {
  if(!values||values.length===0) return 0;
  const picked=values.slice(0,n);
  const sum=picked.reduce((acc,x) => acc+Number(x),0);
  return picked.length? sum/picked.length:0;
}

function calcFlatInstallmentFixed(principal,totalInterest,termMonths) {
  const n=Number(termMonths);
  const P=Number(principal);
  const I=Number(totalInterest); // ดอกเบี้ยรวมคงที่

  const monthlyInterest=I/n;
  const monthlyPrincipal=P/n;
  const installment=monthlyPrincipal+monthlyInterest;
  const totalPPI=P+I;

  return {installment,monthlyPrincipal,monthlyInterest,totalInterest: I,totalPPI};
}


// Max approved amount จาก threshold (Flat)
function calcMaxApprovedFlat(allowedInstallment,annualRatePercent,termMonths) {
  const r=Number(annualRatePercent)/100;
  const n=Number(termMonths);

  const denom=(1/n)+(r/12);
  if(denom<=0) return 0;

  const p=Number(allowedInstallment)/denom;
  return p>0? p:0;
}


exports.createLoanApplication=async (req,res) => {
  const userId=req.user?.id;

  try {
    const {
      borrowerId,
      loanType,
      customerType,
      loanPurpose,
      loanAmountRequested,
      termMonths,
      interestRatePa,
      repaymentMode,
      processingFeesPercent,
      collateralFeesPercent,
      otherFeesPercent,
      evidenceOfIncome,
      evidenceOfIncomeType,
      documentLinks,
      preparerComments,
    }=req.body;

    // Validation (เหมือนเดิม)
    if(!borrowerId||!loanPurpose||loanAmountRequested==null||!termMonths||interestRatePa==null) {
      return res.status(400).json({
        success: false,
        message: "borrowerId, loanPurpose, loanAmountRequested, termMonths, interestRatePa are required",
      });
    }

    // ดึง borrower พร้อม sector (เพิ่มบรรทัดนี้)
    const borrower=await prisma.borrower.findUnique({
      where: {id: Number(borrowerId)},
      include: {sector: true} // ดึง Sector มาด้วย
    });

    if(!borrower) {
      return res.status(404).json({success: false,message: "Borrower not found"});
    }

    const loanAmount=toNumber(loanAmountRequested,0);
    const term=Number(termMonths);
    const rate=toNumber(interestRatePa,0);

    const mode=repaymentMode||"Flat rate";
    if(mode!=="Flat rate") {
      return res.status(400).json({
        success: false,
        message: "Only Flat rate repayment mode is supported at this time",
      });
    }

    const totalInterest=loanAmount*(rate/100); // ดอกเบี้ยรวมคงที่ตลอดสัญญา

    // คำนวณ installment (เหมือนเดิม)
    const {installment,monthlyPrincipal,monthlyInterest,totalPPI}=
      calcFlatInstallmentFixed(loanAmount,totalInterest,term);

    // Fetch income (เหมือนเดิม)
    const salaryRows=await prisma.borrowerIncome.findMany({
      where: {borrowerId: Number(borrowerId)},
      orderBy: {monthYear: "desc"},
      take: 6,
    });

    const bizRows=await prisma.businessIncome.findMany({
      where: {borrowerId: Number(borrowerId)},
      orderBy: {monthYear: "desc"},
      take: 6,
    });

    const avgSalary=avgLastN(salaryRows.map(r => r.netIncome),6);
    const avgBiz=avgLastN(bizRows.map(r => r.netProfit),6);

    const totalNetIncome=avgSalary+avgBiz;

    if(totalNetIncome<=0) {
      return res.status(400).json({
        success: false,
        message: "ບໍ່ສາມາດສ້າງໃບສະໝັກເງິນກູ້ໄດ້: ບໍ່ພົບຂໍ້ມູນລາຍຮັບຂອງຜູ້ກູ້ຢືມ (BorrowerIncome/BusinessIncome). ກະລຸນາກວດສອບຂໍ້ມູນໃນລະບົບ."
      });
    }

    // Existing debts (เหมือนเดิม)
    const loans=await prisma.externalLoan.findMany({
      where: {
        borrowerId: Number(borrowerId),
        isDeleted: false,
      },
    });

    let exisInstallToFina=0;
    let payInstallToOther=0;

    for(const l of loans) {
      const active=normalizeStatusActive(l.status);
      if(!active) continue;

      const inst=l.monthlyInstallment? Number(l.monthlyInstallment):0;
      if(!inst) continue;

      if(l.source==="FINA_INTERNAL") exisInstallToFina+=inst;
      else payInstallToOther+=inst;
    }

    const currInstallToFina=installment;
    const totalInstallment=currInstallToFina+exisInstallToFina+payInstallToOther;
    const dtiRatio=(totalInstallment/totalNetIncome)*100;
    const endingNetIncome=totalNetIncome-totalInstallment;

    const dtiThreshold=60;
    const allowedInstallment=(totalNetIncome*(dtiThreshold/100))-(exisInstallToFina+payInstallToOther);

    // ──────────────────────────────────────────────────────────────
    // เพิ่มส่วนคำนวณจาก Sector (smfV3) ที่นี่เท่านั้น
    // ──────────────────────────────────────────────────────────────
    let riskFactor=1.0;
    let sectorRiskLevel="Medium";
    let sectorSmfV3Used=null;

    if(borrower?.sector) {
      const smfV3=Number(borrower.sector.smfV3||0);
      sectorSmfV3Used=smfV3;

      if(smfV3>=4.0) {
        riskFactor=1.20;
        sectorRiskLevel="Very Low";
      } else if(smfV3>=3.0) {
        riskFactor=1.10;
        sectorRiskLevel="Low";
      } else if(smfV3>=2.0) {
        riskFactor=1.0;
        sectorRiskLevel="Medium";
      } else if(smfV3>=1.0) {
        riskFactor=0.85;
        sectorRiskLevel="High";
      } else {
        riskFactor=0.70;
        sectorRiskLevel="Very High";
      }
    }

    let maxApprovedAmount=calcMaxApprovedFlat(allowedInstallment,rate,term)*riskFactor;
    // Transaction: ย้ายการคำนวณ 5 field เข้าไปที่นี่
    const result=await prisma.$transaction(async (tx) => {
      const application=await tx.loanApplication.create({
        data: {
          userId,
          borrowerId: Number(borrowerId),
          loanType: loanType||undefined,
          customerType: customerType||undefined,
          loanPurpose,
          loanAmountRequested: toDecimal(loanAmount,"0"),
          termMonths: term,
          interestRatePa: toDecimal(rate,"0"),
          repaymentMode: mode,
          processingFeesPercent: processingFeesPercent!=null? toDecimal(processingFeesPercent,"0"):undefined,
          collateralFeesPercent: collateralFeesPercent!=null? toDecimal(collateralFeesPercent,"0"):undefined,
          otherFeesPercent: otherFeesPercent!=null? toDecimal(otherFeesPercent,"0"):undefined,
          evidenceOfIncome: evidenceOfIncome||null,
          evidenceOfIncomeType: evidenceOfIncomeType||undefined,
          documentLinks: documentLinks?.trim()||null,
        },
      });

      // เงินต้นต่อเดือน
      const monthlyPrincipal=loanAmount/term;

      // ดอกเบี้ยรวมคงที่ (Flat Rate)
      const monthlyInterest=totalInterest/term;

      // งวดต่อเดือน = ต้น + ดอก
      const installment=monthlyPrincipal+monthlyInterest;

      // คำนวณยอดรวมกับ existing loans
      const existingMonthlyInstallment=exisInstallToFina+payInstallToOther;
      const totalMonthlyInstallment=installment+existingMonthlyInstallment;

      // ค่าธรรมเนียมเงินกู้
      const processingFeePercent=toNumber(req.body.processingFeesPercent,1);
      const processingFeeAmount=loanAmount*(processingFeePercent/100);

      const assessment=await tx.assessment.create({
        data: {
          applicationId: application.id,
          dtiRatio: toDecimal(dtiRatio,"0"),
          dtiThreshold: toDecimal(dtiThreshold,"60"),
          installmentAmount: toDecimal(installment,"0"),
          currInstallToFina: toDecimal(installment,"0"),
          exisInstallToFina: toDecimal(exisInstallToFina,"0"),
          payInstallToOther: toDecimal(payInstallToOther,"0"),
          totalInstallment: toDecimal(totalMonthlyInstallment,"0"),
          totalNetIncome: toDecimal(totalNetIncome,"0"),
          endingNetIncome: toDecimal(endingNetIncome,"0"),
          totalInterest: toDecimal(totalInterest,"0"),
          totalPrincipalPlusInterest: toDecimal(loanAmount+totalInterest,"0"),
          maxApprovedAmount: toDecimal(maxApprovedAmount,"0"),
          finalApprovalStatus: "PENDING",
          assessedById: userId,
          preparerComments: preparerComments?.trim()||"Created by CREDIT_OFFICER - Pending further review",
          currentApprovalStep: "PENDING_VERIFIER",
          existingMonthlyInstallment: toDecimal(existingMonthlyInstallment,"0"),
          totalMonthlyInstallment: toDecimal(totalMonthlyInstallment,"0"),
          processingFeeAmount: toDecimal(processingFeeAmount,"0"),
          monthlyPrincipal: toDecimal(monthlyPrincipal,"0"),
          monthlyInterest: toDecimal(monthlyInterest,"0"),


          sectorRiskLevel: sectorRiskLevel,
          sectorSmfV3Used: sectorSmfV3Used,
          riskAdjustmentFactor: riskFactor,

          sectorNameAtAssessment: borrower?.sector?.sector||null,
          subSectorAtAssessment: borrower?.sector?.subSector||null,
          bolCodeAtAssessment: borrower?.sector?.bolCode||null,
          smfV3AtAssessment: borrower?.sector?.smfV3||null,
        },
      });

      // Audit logs (เหมือนเดิม)
      await writeAuditLog({
        tx,
        req,
        userId,
        action: "CREATE",
        entityType: "LoanApplication",
        entityId: application.id,
        newValue: application,
        description: `Created loan application borrowerId=${borrowerId}`,
      });

      await writeAuditLog({
        tx,
        req,
        userId,
        action: "CREATE",
        entityType: "Assessment",
        entityId: application.id,
        newValue: {
          dtiRatio,
          totalNetIncome,
          totalInstallment,
          endingNetIncome,
          exisInstallToFina,
          payInstallToOther,
          currInstallToFina,
          totalInterest,
          totalPPI,
          maxApprovedAmount,
          existingMonthlyInstallment,
          totalMonthlyInstallment,
          processingFeeAmount,
          monthlyPrincipal,
          monthlyInterest,
          sectorRiskLevel,          // มีค่าเสมอ (ปานกลาง ถ้าไม่มี sector)
          sectorSmfV3Used,          // มีค่าเสมอ (null ถ้าไม่มี)
          riskAdjustmentFactor: riskFactor,  // ← เปลี่ยนตรงนี้! ใช้ riskFactor ที่ประกาศไว้
        },
        description: `Auto-created assessment for applicationId=${application.id}`,
      });

      return {application,assessment};
    });

    const full=await prisma.loanApplication.findUnique({
      where: {id: result.application.id},
      include: {
        borrower: {
          include: {sector: true} // ดึง sector มาแสดงด้วย
        },
        assessment: true,
      },
    });
    res.status(201).json({success: true,data: full});
    console.log(result.application.id)
    const sendEmailSuccess=await notifyVerifierOnSubmit({
      applicationId: result.application.id,
    });
    if(sendEmailSuccess) {
      console.log("Success")
    }
  } catch(err) {
    console.error("CreateLoanApplication Error:",err);
    return res.status(500).json({success: false,message: "System error"});
  }
};
// POST /loan-applications/:id/resubmit-to-verifier
exports.resubmitToVerifier=async (req,res) => {
  const userId=req.user?.id;
  const id=Number(req.params.id);

  try {
    const application=await prisma.loanApplication.findUnique({
      where: {id},
      include: {assessment: true},
    });

    if(!application) {
      return res.status(404).json({success: false,message: "ບໍ່ພົບຄຳຂໍກູ້"});
    }

    if(application.status!=="RETURNED") {
      return res.status(400).json({
        success: false,
        message: "ສາມາດສົ່ງກັບ Verifier ໄດ້ເພາະຄຳຂໍທີ່ RETURNED ເທົ່ານັ້ນ",
      });
    }

    if(req.user.role!=="CREDIT_OFFICER") {
      return res.status(403).json({
        success: false,
        message: "ທ່ານບໍ່ມີສິດສົ່ງກັບ Verifier (ຕ້ອງເປັນ CREDIT_OFFICER)",
      });
    }

    if(!application.assessment) {
      return res.status(400).json({
        success: false,
        message: "ລາຍການນີ້ຍັງບໍ່ມີ Assessment",
      });
    }

    const note=req.body?.comments?.trim()||null;

    await prisma.$transaction(async (tx) => {
      // 1) LoanApplication -> กลับไปให้ verifier ตรวจ
      await tx.loanApplication.update({
        where: {id},
        data: {
          status: "PENDING_VERIFIER",
          // ไม่ต้อง set updatedAt เอง (มี @updatedAt)
        },
      });

      // 2) Assessment -> reset step + clear verifier result เดิม
      await tx.assessment.update({
        where: {applicationId: id},
        data: {
          currentApprovalStep: "PENDING_VERIFIER",
          verifierComments: null,
          // ✅ สำคัญ: ไม่มี verifierId ให้ใช้ disconnect
          verifier: {disconnect: true},

        },
      });

      // 3) ApprovalHistory
      await tx.approvalHistory.create({
        data: {
          assessmentId: application.assessment.id,
          approverId: userId,
          level: "CO_RESUBMIT",
          status: "RESUBMITTED",
          comments: note||"ສົ່ງກັບ Verifier ເພື່ອກວດສອບໃໝ່ຫຼັງແກ້ໄຂ",
        },
      });

      // 4) Audit log
      await writeAuditLog({
        tx,
        req,
        userId,
        action: "RESUBMIT_TO_VERIFIER",
        entityType: "LoanApplication",
        entityId: id,
        oldValue: {status: application.status},
        newValue: {status: "PENDING_VERIFIER"},
        description: `CO ສົ່ງກັບ Verifier ອີກຄັ້ງ (id=${id})`,
      });
    });

    const full=await prisma.loanApplication.findUnique({
      where: {id},
      include: {borrower: true,assessment: true},
    });
    console.log(id);
    notifyVerifierOnSubmit({applicationId: id});
    return res.status(200).json({
      success: true,
      message: "ສົ່ງກັບ Verifier ສຳເລັດ",
      data: full,
    });
  } catch(err) {
    console.error("ResubmitToVerifier Error:",err);
    return res.status(500).json({
      success: false,
      message: err.message||"ເກີດຂໍ້ຜິດພາດ",
    });
  }
};

exports.updateLoanApplication=async (req,res) => {
  const userId=req.user?.id;
  const id=Number(req.params.id);

  try {
    const old=await prisma.loanApplication.findUnique({
      where: {id},
      include: {assessment: true},
    });

    if(!old) {
      return res.status(404).json({success: false,message: "ບໍ່ພົບຄຳຂໍກູ້"});
    }

    if(old.status!=="PENDING"&&old.status!=="RETURNED") {
      return res.status(400).json({
        success: false,
        message: "ສາມາດແກ້ໄຂໄດ້ເພາະຄຳຂໍທີ່ຍັງລໍຖ້າອະນຸມັດ (PENDING) ຫຼື ຄຳຂໍທີ່ຖືກສົ່ງຄືນ (RETURNED) ເທົ່ານັ້ນ",
      });
    }

    // Allowed fields
    // Allowed fields – ลบ "preparerComments" ออกไปเลย (ไม่ต้องอยู่ใน allow ของ LoanApplication)
    const allow=[
      "loanPurpose",
      "loanAmountRequested",
      "termMonths",
      "interestRatePa",
      "repaymentMode",
      "processingFeesPercent",
      "collateralFeesPercent",
      "otherFeesPercent",
      "evidenceOfIncome",
      "evidenceOfIncomeType",
      "loanType",
      "customerType",
      "documentLinks",
      // ไม่มี "preparerComments" ที่นี่!
    ];

    const patch={};
    for(const k of allow) {
      if(req.body[k]!==undefined) patch[k]=req.body[k];
    }

    // แยก preparerComments ออกมาต่างหาก
    const newPreparerComments=req.body.preparerComments!==undefined
      ? req.body.preparerComments?.trim()||null
      :undefined;

    const updated=await prisma.$transaction(async (tx) => {
      const newApp=await tx.loanApplication.update({
        where: {id},
        data: {
          ...patch,  // ไม่มี preparerComments แล้ว → ปลอดภัย
          termMonths: patch.termMonths!=null? Number(patch.termMonths):undefined,
          loanAmountRequested: patch.loanAmountRequested!=null? Number(patch.loanAmountRequested):undefined,
          interestRatePa: patch.interestRatePa!=null? Number(patch.interestRatePa):undefined,
          processingFeesPercent: patch.processingFeesPercent!=null? Number(patch.processingFeesPercent):undefined,
          collateralFeesPercent: patch.collateralFeesPercent!=null? Number(patch.collateralFeesPercent):undefined,
          otherFeesPercent: patch.otherFeesPercent!=null? Number(patch.otherFeesPercent):undefined,
          documentLinks: patch.documentLinks?.trim()||null,
        },
      });

      if(newPreparerComments!==undefined&&old.assessment) {
        await tx.assessment.update({
          where: {applicationId: id},
          data: {
            preparerComments: newPreparerComments,
          },
        });
      }
      // หลัง update newApp
      if(patch.preparerComments!==undefined&&old.assessment) {
        await tx.assessment.update({
          where: {applicationId: id},  // ใช้ applicationId ปลอดภัยกว่า (id คือ applicationId)
          data: {
            preparerComments: patch.preparerComments?.trim()||null,
          },
        });
      }
      // Recompute assessment (ไม่มี sector แล้ว)
      const loanAmount=Number(newApp.loanAmountRequested);
      const term=Number(newApp.termMonths);
      const rate=Number(newApp.interestRatePa);

      if(isNaN(loanAmount)||isNaN(term)||isNaN(rate)||term<=0||loanAmount<=0||rate<0) {
        throw new Error("ข้อมูลจำนวนเงินกู้ ระยะเวลา หรืออัตราดอกเบี้ยไม่ถูกต้อง");
      }

      if((newApp.repaymentMode||"Flat rate")!=="Flat rate") {
        throw new Error("Only Flat rate repayment mode is supported");
      }

      const totalInterest=loanAmount*(rate/100);
      const calcResult=calcFlatInstallmentFixed(loanAmount,totalInterest,term);

      const installment=calcResult.installment;
      const monthlyPrincipal=calcResult.monthlyPrincipal;
      const monthlyInterest=calcResult.monthlyInterest;
      const totalPPI=calcResult.totalPPI;

      // Income
      const salaryRows=await tx.borrowerIncome.findMany({
        where: {borrowerId: newApp.borrowerId},
        orderBy: {monthYear: "desc"},
        take: 6,
      });

      const bizRows=await tx.businessIncome.findMany({
        where: {borrowerId: newApp.borrowerId},
        orderBy: {monthYear: "desc"},
        take: 6,
      });

      const totalNetIncome=avgLastN(salaryRows.map(r => r.netIncome),6)+avgLastN(bizRows.map(r => r.netProfit),6);
      if(totalNetIncome<=0) {
        throw new Error("No sufficient income data found for recomputation");
      }

      // Existing debts
      const loans=await tx.externalLoan.findMany({
        where: {borrowerId: newApp.borrowerId,isDeleted: false},
      });

      let exisInstallToFina=0;
      let payInstallToOther=0;

      for(const l of loans) {
        const active=normalizeStatusActive(l.status);
        if(!active) continue;
        const inst=l.monthlyInstallment? Number(l.monthlyInstallment):0;
        if(!inst) continue;
        if(l.source==="FINA_INTERNAL") exisInstallToFina+=inst;
        else payInstallToOther+=inst;
      }

      const currInstallToFina=installment;
      const totalInstallment=currInstallToFina+exisInstallToFina+payInstallToOther;
      const dtiRatio=totalNetIncome>0? (totalInstallment/totalNetIncome)*100:0;
      const endingNetIncome=totalNetIncome-totalInstallment;

      const dtiThreshold=60;
      const allowedInstallment=(totalNetIncome*(dtiThreshold/100))-(exisInstallToFina+payInstallToOther);

      let maxApprovedAmount=calcMaxApprovedFlat(allowedInstallment,rate,term);

      // Optional: จำกัดวงเงินไม่ให้สูงเกิน requested มากเกินไป (ยังเก็บไว้เผื่อ)
      maxApprovedAmount=Math.min(maxApprovedAmount,loanAmount*1.5);

      // ค่าธรรมเนียม
      const processingFeePercent=toNumber(newApp.processingFeesPercent,1);
      const processingFeeAmount=loanAmount*(processingFeePercent/100);

      // Update assessment – ลบ field sector ทั้งหมดออก
      const oldAssess=await tx.assessment.findUnique({where: {applicationId: id}});

      const newAssess=await tx.assessment.update({
        where: {applicationId: id},
        data: {
          dtiRatio: Number(dtiRatio.toFixed(2)),
          installmentAmount: Number(installment),
          currInstallToFina: Number(currInstallToFina),
          exisInstallToFina: Number(exisInstallToFina),
          payInstallToOther: Number(payInstallToOther),
          totalInstallment: Number(totalInstallment),
          totalNetIncome: Number(totalNetIncome),
          endingNetIncome: Number(endingNetIncome),
          totalInterest: Number(totalInterest),
          totalPrincipalPlusInterest: Number(totalPPI),
          maxApprovedAmount: Number(maxApprovedAmount),

          monthlyPrincipal: Number(monthlyPrincipal),
          monthlyInterest: Number(monthlyInterest),
          existingMonthlyInstallment: Number(exisInstallToFina+payInstallToOther),
          totalMonthlyInstallment: Number(totalInstallment),
          processingFeeAmount: Number(processingFeeAmount),

          // preparerComments (ถ้ามีการส่งมาใหม่)
          ...(patch.preparerComments!==undefined&&{
            preparerComments: patch.preparerComments?.trim()||null,
          }),
        },
      });

      // Audit logs
      await writeAuditLog({
        tx,
        req,
        userId,
        action: "UPDATE",
        entityType: "LoanApplication",
        entityId: id,
        oldValue: old,
        newValue: newApp,
        description: `ແກ້ໄຂຄຳຂໍກູ້ id=${id}`,
      });

      await writeAuditLog({
        tx,
        req,
        userId,
        action: "UPDATE",
        entityType: "Assessment",
        entityId: id,
        oldValue: oldAssess,
        newValue: newAssess,
        description: `ຄຳນວນ assessment ໃໝ່ສຳລັບຄຳຂໍກູ້ id=${id}`,
      });

      return newApp;
    });

    const full=await prisma.loanApplication.findUnique({
      where: {id: updated.id},
      include: {
        borrower: true,  // ไม่ include sector แล้ว
        assessment: true,
      },
    });

    res.status(200).json({success: true,data: full});
    await notifyCeoOnDcoApprove({applicationId: id});
  } catch(err) {
    console.error("UpdateLoanApplication Error:",err);
    return res.status(500).json({success: false,message: err.message||"ເກີດຂໍ້ຜິດພາດໃນລະບົບ"});
  }
};
// GET Loan Application by ID
exports.getLoanApplicationById=async (req,res) => {
  try {
    const id=Number(req.params.id);

    const app=await prisma.loanApplication.findUnique({
      where: {id: id},
      include: {
        borrower: {
          include: {
            sector: true,
          },
        },
        assessment: true,
        payments: true,
      },
    });

    if(!app) return res.status(404).json({success: false,message: "ບໍ່ພົບ LoanApplication"});

    return res.json({success: true,data: app});
  } catch(err) {
    console.error("GetLoanApplicationById Error:",err);
    return res.status(500).json({success: false,message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ"});
  }
};

// GET Loan Applications list (with search & pagination)
exports.getLoanApplications=async (req,res) => {
  try {
    const {q,status,page=1,limit=10}=req.query;

    const where={
      ...(status? {status}:{status: {not: "RETURNED"}}),
      ...(q
        ? {
          OR: [
            {loanPurpose: {contains: q,mode: "insensitive"}},
            {borrower: {laoFirstName: {contains: q,mode: "insensitive"}}},
            {borrower: {laoLastName: {contains: q,mode: "insensitive"}}},
            {borrower: {phone: {contains: q}}},
          ],
        }
        :{}),
    };


    const data=await prisma.loanApplication.findMany({
      where,
      include: {
        borrower: {
          include: {
            sector: true, // เพิ่มตรงนี้เพื่อดึง Sector มาด้วย
          },
        },
        assessment: true,
      },
      orderBy: {
        submittedAt: "desc",
      },
      skip: (Number(page)-1)*Number(limit),
      take: Number(limit),
    });

    const total=await prisma.loanApplication.count({where});

    return res.json({
      success: true,
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
      },
    });
  } catch(err) {
    console.error("GetLoanApplications Error:",err);
    return res
      .status(500)
      .json({success: false,message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ"});
  }
};

exports.getLoanApplicationsByStatus=async (req,res) => {
  try {
    const {
      approvalStep,   // สำหรับ PENDING_VERIFIER, PENDING_DCO, etc.
      status,         // สำหรับ APPROVED, RETURNED, REJECTED, etc. (รองรับหลายค่า เช่น APPROVED,REJECTED)
      q,
      page=1,
      limit=10,
    }=req.query;

    // Validation: ต้องส่งอย่างใดอย่างหนึ่ง
    if(!approvalStep&&!status) {
      return res.status(400).json({
        success: false,
        message: "ກະລຸນາລະບຸ approvalStep ຫຼື status",
      });
    }

    const validApprovalSteps=["PENDING_VERIFIER","PENDING_DCO","PENDING_CEO","APPROVED","REJECTED"];
    const validStatuses=[
      "PENDING",
      "PENDING_VERIFIER",
      "PENDING_DCO",
      "PENDING_CEO",
      "APPROVED",
      "REJECTED",
      "RETURNED",
      "DISBURSED",
      "CLOSED",
      "OVERDUE",
    ];

    // Validate approvalStep
    if(approvalStep&&!validApprovalSteps.includes(approvalStep)) {
      return res.status(400).json({
        success: false,
        message: `approvalStep ບໍ່ຖືກຕ້ອງ ຕ້ອງເປັນໃນ: ${validApprovalSteps.join(", ")}`,
      });
    }

    // Validate status (รองรับหลายค่า แยกด้วย comma)
    let statusList=[];
    if(status) {
      statusList=status.split(",").map(s => s.trim().toUpperCase());
      const invalid=statusList.filter(s => !validStatuses.includes(s));
      if(invalid.length>0) {
        return res.status(400).json({
          success: false,
          message: `status ບໍ່ຖືກຕ້ອງ: ${invalid.join(", ")} (ຕ້ອງເປັນໃນ: ${validStatuses.join(", ")})`,
        });
      }
    }

    const pageNum=Math.max(1,Number(page));
    const limitNum=Math.min(50,Math.max(1,Number(limit)));
    const qTrim=(q||"").trim();

    const where={};

    // 1. Filter ด้วย approvalStep (ถ้าส่งมา)
    if(approvalStep) {
      where.assessment={
        is: {
          currentApprovalStep: approvalStep,
        },
      };
    }

    // 2. Filter ด้วย status (รองรับหลายค่า)
    if(statusList.length>0) {
      where.status={in: statusList};
    }

    // Search filter
    if(qTrim) {
      where.OR=[
        {loanPurpose: {contains: qTrim,mode: "insensitive"}},
        {borrower: {laoFirstName: {contains: qTrim,mode: "insensitive"}}},
        {borrower: {laoLastName: {contains: qTrim,mode: "insensitive"}}},
        {borrower: {firstName: {contains: qTrim,mode: "insensitive"}}},
        {borrower: {lastName: {contains: qTrim,mode: "insensitive"}}},
        {borrower: {phone: {contains: qTrim}}},
      ];
    }

    // Query
    const [data,total]=await Promise.all([
      prisma.loanApplication.findMany({
        where,
        include: {
          borrower: {include: {sector: true}},
          assessment: true,
        },
        orderBy: {submittedAt: "desc"},
        skip: (pageNum-1)*limitNum,
        take: limitNum,
      }),
      prisma.loanApplication.count({where}),
    ]);

    return res.json({
      success: true,
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total/limitNum),
      },
    });
  } catch(err) {
    console.error("❌ getLoanApplicationsByStatus Error:",err);
    return res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ",
    });
  }
};
// POST /loan-applications/:id/approve-by-ceo
exports.approveByCeo=async (req,res) => {
  const {id}=req.params;
  const {comments}=req.body;

  try {
    const note=comments?.trim();
    if(!note) {
      return res.status(400).json({
        success: false,
        message: "ກະລຸນາໃສ່ຄຳເຫັນຂອງ CEO ກ່ອນ Approve",
      });
    }

    const application=await prisma.loanApplication.findUnique({
      where: {id: Number(id)},
      include: {assessment: true},
    });

    if(!application) {
      return res.status(404).json({
        success: false,
        message: "ບໍ່ພົບຄຳຂໍກູ້ລາຍການນີ້",
      });
    }

    if(!application.assessment) {
      return res.status(400).json({
        success: false,
        message: "ລາຍການນີ້ຍັງບໍ່ມີ Assessment",
      });
    }

    // ✅ CEO ทำได้เฉพาะตอน PENDING_CEO
    if(application.assessment.currentApprovalStep!=="PENDING_CEO") {
      return res.status(400).json({
        success: false,
        message: "ຄຳຂໍກູ້ນີ້ບໍ່ຢູ່ໃນຂັ້ນຕອນທີ່ CEO ສາມາດ Approve ໄດ້",
      });
    }

    await prisma.$transaction(async (tx) => {
      const fromStep=application.assessment.currentApprovalStep; // PENDING_CEO
      const fromStatus=application.status;

      // 1) Update Assessment (final)
      await tx.assessment.update({
        where: {id: application.assessment.id},
        data: {
          currentApprovalStep: "APPROVED",
          finalApprovalStatus: "APPROVED", // ถ้ามี field นี้
          ceoId: req.user.id,
          ceoComments: note,
          assessedAt: new Date(),
        },
      });

      // 2) Sync LoanApplication status
      await tx.loanApplication.update({
        where: {id: Number(id)},
        data: {
          status: "APPROVED",
          updatedAt: new Date(),
        },
      });

      // 3) ApprovalHistory
      await tx.approvalHistory.create({
        data: {
          assessmentId: application.assessment.id,
          approverId: req.user.id,
          level: "CEO",
          status: "APPROVED",
          comments: note,
        },
      });

      // 4) AuditLog
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: "APPROVE_BY_CEO",
          entityType: "Assessment",
          entityId: application.assessment.id,
          oldValue: {approvalStep: fromStep,applicationStatus: fromStatus},
          newValue: {approvalStep: "APPROVED",applicationStatus: "APPROVED"},
          changes: {
            approvalStep: {from: fromStep,to: "APPROVED"},
            applicationStatus: {from: fromStatus,to: "APPROVED"},
            ceoComments: note,
          },
          description: `CEO (ID: ${req.user.id}) ອະນຸມັດສຸດທ້າຍ Assessment ${application.assessment.id} (App ${id})`,
          ipAddress: req.ip||null,
          userAgent: req.headers["user-agent"]||null,
        },
      });
    });
    res.status(200).json({
      success: true,
      message: "CEO Approve ສຳເລັດ (Final Approved)",
      data: {
        applicationId: Number(id),
        step: "APPROVED",
        status: "APPROVED",
      },
    });
    notifyCreditOfficerOnCeoDecision({
      applicationId: id,
      decision: "APPROVED"
    })
  } catch(err) {
    console.error("approveByCeo Error:",err);
    return res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນການ Approve",
    });
  }
};
// POST /loan-applications/:id/reject-by-ceo
exports.rejectByCeo=async (req,res) => {
  const {id}=req.params;
  const {comments}=req.body;

  try {
    const note=comments?.trim();
    if(!note) {
      return res.status(400).json({
        success: false,
        message: "ກະລຸນາໃສ່ເຫດຜົນ/ຄຳເຫັນຂອງ CEO ກ່ອນ Reject",
      });
    }

    const application=await prisma.loanApplication.findUnique({
      where: {id: Number(id)},
      include: {assessment: true},
    });

    if(!application) {
      return res.status(404).json({
        success: false,
        message: "ບໍ່ພົບຄຳຂໍກູ້ລາຍການນີ້",
      });
    }

    if(!application.assessment) {
      return res.status(400).json({
        success: false,
        message: "ລາຍການນີ້ຍັງບໍ່ມີ Assessment",
      });
    }

    if(application.assessment.currentApprovalStep!=="PENDING_CEO") {
      return res.status(400).json({
        success: false,
        message: "ຄຳຂໍກູ້ນີ້ບໍ່ຢູ່ໃນຂັ້ນຕອນທີ່ CEO ສາມາດ Reject ໄດ້",
      });
    }

    await prisma.$transaction(async (tx) => {
      const fromStep=application.assessment.currentApprovalStep; // PENDING_CEO
      const fromStatus=application.status;

      // 1) Update Assessment (final reject)
      await tx.assessment.update({
        where: {id: application.assessment.id},
        data: {
          currentApprovalStep: "REJECTED",
          finalApprovalStatus: "REJECTED",
          ceoId: req.user.id,
          ceoComments: note,
          assessedAt: new Date(),
        },
      });

      // 2) Sync LoanApplication status
      await tx.loanApplication.update({
        where: {id: Number(id)},
        data: {
          status: "REJECTED",
          updatedAt: new Date(),
        },
      });

      // 3) ApprovalHistory
      await tx.approvalHistory.create({
        data: {
          assessmentId: application.assessment.id,
          approverId: req.user.id,
          level: "CEO",
          status: "REJECTED",
          comments: note,
        },
      });

      // 4) AuditLog
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: "REJECT_BY_CEO",
          entityType: "Assessment",
          entityId: application.assessment.id,
          oldValue: {approvalStep: fromStep,applicationStatus: fromStatus},
          newValue: {approvalStep: "REJECTED",applicationStatus: "REJECTED"},
          changes: {
            approvalStep: {from: fromStep,to: "REJECTED"},
            applicationStatus: {from: fromStatus,to: "REJECTED"},
            ceoComments: note,
          },
          description: `CEO (ID: ${req.user.id}) ປະຕິເສດສຸດທ້າຍ Assessment ${application.assessment.id} (App ${id})`,
          ipAddress: req.ip||null,
          userAgent: req.headers["user-agent"]||null,
        },
      });
    });
    //  notifyCreditOfficerOnCeoDecision({
    //   applicationId: id,
    //   decision: "REJECTED"
    // });
     res.json({
      success: true,
      message: "CEO Reject ສຳເລັດ (Final Rejected)",
      data: {
        applicationId: Number(id),
        step: "REJECTED",
        status: "REJECTED",
      },
    });
  } catch(err) {
    console.error("rejectByCeo Error:",err);
    return res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນການ Reject",
    });
  }
};


// POST /loan-applications/:id/approve-by-dco
exports.approveByDco=async (req,res) => {
  const {id}=req.params;
  const {comments}=req.body;

  try {
    const note=comments?.trim();
    if(!note) {
      return res.status(400).json({
        success: false,
        message: "ກະລຸນາໃສ່ຄຳເຫັນຂອງ DCO ກ່ອນ Approve",
      });
    }

    const application=await prisma.loanApplication.findUnique({
      where: {id: Number(id)},
      include: {assessment: true},
    });

    if(!application) {
      return res.status(404).json({
        success: false,
        message: "ບໍ່ພົບຄຳຂໍກູ້ລາຍການນີ້",
      });
    }

    if(!application.assessment) {
      return res.status(400).json({
        success: false,
        message: "ລາຍການນີ້ຍັງບໍ່ມີ Assessment",
      });
    }

    // ✅ DCO ทำได้เฉพาะตอน PENDING_DCO
    if(application.assessment.currentApprovalStep!=="PENDING_DCO") {
      return res.status(400).json({
        success: false,
        message: "ຄຳຂໍກູ້ນີ້ບໍ່ຢູ່ໃນຂັ້ນຕອນທີ່ DCO ສາມາດ Approve ໄດ້",
      });
    }

    await prisma.$transaction(async (tx) => {
      const fromStep=application.assessment.currentApprovalStep; // PENDING_DCO
      const fromStatus=application.status;

      // 1) Update Assessment
      await tx.assessment.update({
        where: {id: application.assessment.id},
        data: {
          currentApprovalStep: "PENDING_CEO",
          dcoId: req.user.id,
          dcoComments: note,
          assessedAt: new Date(),
        },
      });

      // 2) Sync LoanApplication status
      await tx.loanApplication.update({
        where: {id: Number(id)},
        data: {
          status: "PENDING_CEO",
          updatedAt: new Date(),
        },
      });

      // 3) ApprovalHistory
      await tx.approvalHistory.create({
        data: {
          assessmentId: application.assessment.id,
          approverId: req.user.id,
          level: "DCO",
          status: "APPROVED",
          comments: note,
        },
      });

      // 4) AuditLog
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: "APPROVE_BY_DCO",
          entityType: "Assessment",
          entityId: application.assessment.id,
          oldValue: {approvalStep: fromStep,applicationStatus: fromStatus},
          newValue: {approvalStep: "PENDING_CEO",applicationStatus: "PENDING_CEO"},
          changes: {
            approvalStep: {from: fromStep,to: "PENDING_CEO"},
            applicationStatus: {from: fromStatus,to: "PENDING_CEO"},
            dcoComments: note,
          },
          description: `DCO (ID: ${req.user.id}) ອະນຸມັດ Assessment ${application.assessment.id} (App ${id})`,
          ipAddress: req.ip||null,
          userAgent: req.headers["user-agent"]||null,
        },
      });
    });


    notifyCeoOnDcoApprove({applicationId: Number(id)})
      .catch(e => console.error("Notify CEO email failed:",e));

    return res.json({
      success: true,
      message: "DCO Approve ສຳເລັດ ສົ່ງຕໍ່ໄປ CEO ແລ້ວ",
      data: {applicationId: Number(id),nextStep: "PENDING_CEO"},
    });
  } catch(err) {
    console.error("approveByDco Error:",err);
    return res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນການ Approve",
    });
  }
};
// POST /loan-applications/:id/reject-by-dco
exports.rejectByDco=async (req,res) => {
  const {id}=req.params;
  const {comments}=req.body;

  try {
    const note=comments?.trim();
    if(!note) {
      return res.status(400).json({
        success: false,
        message: "ກະລຸນາໃສ່ເຫດຜົນ/ຄຳເຫັນຂອງ DCO ກ່ອນ Reject",
      });
    }

    const application=await prisma.loanApplication.findUnique({
      where: {id: Number(id)},
      include: {assessment: true},
    });

    if(!application) {
      return res.status(404).json({
        success: false,
        message: "ບໍ່ພົບຄຳຂໍກູ້ລາຍການນີ້",
      });
    }

    if(!application.assessment) {
      return res.status(400).json({
        success: false,
        message: "ລາຍການນີ້ຍັງບໍ່ມີ Assessment",
      });
    }

    if(application.assessment.currentApprovalStep!=="PENDING_DCO") {
      return res.status(400).json({
        success: false,
        message: "ຄຳຂໍກູ້ນີ້ບໍ່ຢູ່ໃນຂັ້ນຕອນທີ່ DCO ສາມາດ Reject ໄດ້",
      });
    }

    await prisma.$transaction(async (tx) => {
      const fromStep=application.assessment.currentApprovalStep;
      const fromStatus=application.status;

      // 1) Update Assessment
      await tx.assessment.update({
        where: {id: application.assessment.id},
        data: {
          currentApprovalStep: "REJECTED",
          finalApprovalStatus: "REJECTED", // ถ้าคุณมี field นี้
          dcoId: req.user.id,
          dcoComments: note,
          assessedAt: new Date(),
        },
      });

      // 2) Sync LoanApplication status
      await tx.loanApplication.update({
        where: {id: Number(id)},
        data: {
          status: "REJECTED",
          updatedAt: new Date(),
        },
      });

      // 3) ApprovalHistory
      await tx.approvalHistory.create({
        data: {
          assessmentId: application.assessment.id,
          approverId: req.user.id,
          level: "DCO",
          status: "REJECTED",
          comments: note,
        },
      });

      // 4) AuditLog
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: "REJECT_BY_DCO",
          entityType: "Assessment",
          entityId: application.assessment.id,
          oldValue: {approvalStep: fromStep,applicationStatus: fromStatus},
          newValue: {approvalStep: "REJECTED",applicationStatus: "REJECTED"},
          changes: {
            approvalStep: {from: fromStep,to: "REJECTED"},
            applicationStatus: {from: fromStatus,to: "REJECTED"},
            dcoComments: note,
          },
          description: `DCO (ID: ${req.user.id}) ປະຕິເສດ Assessment ${application.assessment.id} (App ${id})`,
          ipAddress: req.ip||null,
          userAgent: req.headers["user-agent"]||null,
        },
      });
    });

    return res.json({
      success: true,
      message: "DCO Reject ສຳເລັດ (ປະຕິເສດຄຳຂໍກູ້)",
      data: {
        applicationId: Number(id),
        step: "REJECTED",
        status: "REJECTED",
      },
    });
  } catch(err) {
    console.error("rejectByDco Error:",err);
    return res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນການ Reject",
    });
  }
};

exports.approveByVerifier=async (req,res) => {
  const {id}=req.params;
  const {comments}=req.body;

  try {
    const note=comments?.trim();
    if(!note) {
      return res.status(400).json({
        success: false,
        message: "ກະລຸນາໃສ່ຄຳເຫັນຂອງ Verifier ກ່ອນ Approve",
      });
    }

    const application=await prisma.loanApplication.findUnique({
      where: {id: Number(id)},
      include: {assessment: true},
    });

    if(!application) {
      return res.status(404).json({
        success: false,
        message: "ບໍ່ພົບຄຳຂໍກູ້ລາຍການນີ້",
      });
    }

    if(!application.assessment) {
      return res.status(400).json({
        success: false,
        message: "ລາຍການນີ້ຍັງບໍ່ມີ Assessment",
      });
    }

    if(application.assessment.currentApprovalStep!=="PENDING_VERIFIER") {
      return res.status(400).json({
        success: false,
        message: "ຄຳຂໍກູ້ນີ້ບໍ່ຢູ່ໃນຂັ້ນຕອນທີ່ Verifier ສາມາດ Approve ໄດ້",
      });
    } if(application.status=="PENDING"||application.status=="RETURNED") {
      return res.status(400).json({
        success: false,
        message: "ຄຳຂໍກູ້ນີ້ບໍ່ຢູ່ໃນຂັ້ນຕອນທີ່ Verifier ສາມາດ Approve ໄດ້",
      });
    }

    await prisma.$transaction(async (tx) => {
      const fromStep=application.assessment.currentApprovalStep;
      const fromStatus=application.status;

      // 1) Update Assessment
      await tx.assessment.update({
        where: {id: application.assessment.id},
        data: {
          currentApprovalStep: "PENDING_DCO",
          verifierId: req.user.id,
          verifierComments: note,
          assessedAt: new Date(),
        },
      });

      // 2) Sync LoanApplication status
      await tx.loanApplication.update({
        where: {id: Number(id)},
        data: {
          status: "PENDING_DCO",
          updatedAt: new Date(),
        },
      });

      // 3) ApprovalHistory
      await tx.approvalHistory.create({
        data: {
          assessmentId: application.assessment.id,
          approverId: req.user.id,
          level: "VERIFIER",
          status: "APPROVED",
          comments: note,
        },
      });

      // 4) AuditLog
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: "APPROVE_BY_VERIFIER",
          entityType: "Assessment",
          entityId: application.assessment.id,
          oldValue: {approvalStep: fromStep,applicationStatus: fromStatus},
          newValue: {approvalStep: "PENDING_DCO",applicationStatus: "PENDING_DCO"},
          changes: {
            approvalStep: {from: fromStep,to: "PENDING_DCO"},
            applicationStatus: {from: fromStatus,to: "PENDING_DCO"},
            verifierComments: note,
          },
          description: `Verifier (ID: ${req.user.id}) ອະນຸມັດ Assessment ${application.assessment.id}`,
          ipAddress: req.ip||null,
          userAgent: req.headers["user-agent"]||null,
        },
      });
    });
    console.log(id);
    notifyDcoOnVerifierApprove({applicationId: Number(id)})
      .catch(e => console.error("Notify DCO email failed:",e));

    return res.json({
      success: true,
      message: "Verifier Approve ສຳເລັດ ສົ່ງຕໍ່ໄປ DCO ແລ້ວ",
      data: {applicationId: Number(id),nextStep: "PENDING_DCO"},
    });
  } catch(err) {
    console.error("approveByVerifier Error:",err);
    return res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນການ Approve",
    });
  }
};

// POST /loan-applications/:id/reject-by-verifier
exports.rejectByVerifier=async (req,res) => {
  const {id}=req.params;
  const {comments}=req.body;

  try {
    // ✅ Reject ต้องมีเหตุผลเสมอ
    const note=comments?.trim();
    if(!note) {
      return res.status(400).json({
        success: false,
        message: "ກະລຸນາໃສ່ເຫດຜົນ/ຄຳເຫັນຂອງ Verifier ກ່ອນ Reject",
      });
    }

    const application=await prisma.loanApplication.findUnique({
      where: {id: Number(id)},
      include: {assessment: true},
    });

    if(!application) {
      return res.status(404).json({
        success: false,
        message: "ບໍ່ພົບຄຳຂໍກູ້ລາຍການນີ້",
      });
    }

    if(!application.assessment) {
      return res.status(400).json({
        success: false,
        message: "ລາຍການນີ້ຍັງບໍ່ມີ Assessment",
      });
    }

    // ✅ check step จาก Assessment เท่านั้น
    if(application.assessment.currentApprovalStep!=="PENDING_VERIFIER") {
      return res.status(400).json({
        success: false,
        message: "ຄຳຂໍກູ້ນີ້ບໍ່ຢູ່ໃນຂັ້ນຕອນທີ່ Verifier ສາມາດ Reject ໄດ້",
      });
    }

    await prisma.$transaction(async (tx) => {
      const fromStep=application.assessment.currentApprovalStep; // PENDING_VERIFIER
      const fromStatus=application.status;

      // 1) Update Assessment: step -> REJECTED + ใส่ verifier info/comment
      await tx.assessment.update({
        where: {id: application.assessment.id},
        data: {
          currentApprovalStep: "REJECTED",
          finalApprovalStatus: "REJECTED", // ✅ ปิดผลสุดท้าย (ถ้าคุณใช้ field นี้)
          verifierId: req.user.id,
          verifierComments: note,
          assessedAt: new Date(),
        },
      });

      // 2) Sync LoanApplication.status -> REJECTED
      await tx.loanApplication.update({
        where: {id: Number(id)},
        data: {
          status: "REJECTED",
          updatedAt: new Date(),
        },
      });

      // 3) ApprovalHistory (timeline)
      await tx.approvalHistory.create({
        data: {
          assessmentId: application.assessment.id,
          approverId: req.user.id,
          level: "VERIFIER",
          status: "REJECTED",
          comments: note,
        },
      });

      // 4) AuditLog 
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: "REJECT_BY_VERIFIER",
          entityType: "Assessment",
          entityId: application.assessment.id,
          oldValue: {approvalStep: fromStep,applicationStatus: fromStatus},
          newValue: {approvalStep: "REJECTED",applicationStatus: "REJECTED"},
          changes: {
            approvalStep: {from: fromStep,to: "REJECTED"},
            applicationStatus: {from: fromStatus,to: "REJECTED"},
            verifierComments: note,
          },
          description: `Verifier (ID: ${req.user.id}) ປະຕິເສດ Assessment ${application.assessment.id} (App ${id})`,
          ipAddress: req.ip||null,
          userAgent: req.headers["user-agent"]||null,
        },
      });
    });

    return res.json({
      success: true,
      message: "Verifier Reject ສຳເລັດ (ປະຕິເສດຄຳຂໍກູ້)",
      data: {
        applicationId: Number(id),
        step: "REJECTED",
        status: "REJECTED",
      },
    });
  } catch(err) {
    console.error("rejectByVerifier Error:",err);
    return res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນການ Reject",
    });
  }
};
// POST /loan-applications/:id/return-by-verifier
// POST /loan-applications/:id/return-by-verifier
exports.returnByVerifier=async (req,res) => {
  const {id}=req.params;
  const {comments}=req.body;

  try {
    const note=comments?.trim();
    if(!note) {
      return res.status(400).json({
        success: false,
        message: "ກະລຸນາໃສ່ເຫດຜົນ/ຄຳເຫັນກ່ອນ Return",
      });
    }

    const application=await prisma.loanApplication.findUnique({
      where: {id: Number(id)},
      include: {assessment: true},
    });

    if(!application) {
      return res.status(404).json({success: false,message: "ບໍ່ພົບຄຳຂໍກູ້ລາຍການນີ້"});
    }

    if(!application.assessment) {
      return res.status(400).json({success: false,message: "ລາຍການນີ້ຍັງບໍ່ມີ Assessment"});
    }

    // ✅ Return ได้เฉพาะตอนอยู่ PENDING_VERIFIER
    if(application.assessment.currentApprovalStep!=="PENDING_VERIFIER") {
      return res.status(400).json({
        success: false,
        message: "ຄຳຂໍກູ້ນີ້ບໍ່ຢູ່ໃນຂັ້ນຕອນທີ່ Verifier ສາມາດ Return ໄດ້",
      });
    }

    await prisma.$transaction(async (tx) => {
      const fromStep=application.assessment.currentApprovalStep; // PENDING_VERIFIER
      const fromStatus=application.status;

      // 1) Assessment: เก็บคอมเมนต์ของ Verifier (เหตุผลส่งกลับ)
      //    step ยังเป็น PENDING_VERIFIER ได้ (เพราะรอ CO แก้แล้วส่งกลับมาให้ Verifier ตรวจอีกครั้ง)
      await tx.assessment.update({
        where: {id: application.assessment.id},
        data: {
          currentApprovalStep: "PENDING_VERIFIER",
          verifierId: req.user.id,
          verifierComments: note,
          assessedAt: new Date(),
        },
      });

      // 2) LoanApplication: ใช้ RETURNED เพื่อให้ CO รู้ว่าโดนตีกลับ
      await tx.loanApplication.update({
        where: {id: Number(id)},
        data: {
          status: "RETURNED", // ✅ ใช้ enum ใหม่
          updatedAt: new Date(),
        },
      });

      // 3) ApprovalHistory: timeline
      await tx.approvalHistory.create({
        data: {
          assessmentId: application.assessment.id,
          approverId: req.user.id,
          level: "VERIFIER",
          status: "RETURNED",
          comments: note,
        },
      });

      // 4) AuditLog
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: "RETURN_BY_VERIFIER",
          entityType: "Assessment",
          entityId: application.assessment.id,
          oldValue: {approvalStep: fromStep,applicationStatus: fromStatus},
          newValue: {approvalStep: "PENDING_VERIFIER",applicationStatus: "RETURNED"},
          changes: {
            approvalStep: {from: fromStep,to: "PENDING_VERIFIER"},
            applicationStatus: {from: fromStatus,to: "RETURNED"},
            verifierComments: note,
          },
          description: `Verifier (ID: ${req.user.id}) ສົ່ງກັບໃຫ້ CO ແກ້ Assessment ${application.assessment.id} (App ${id})`,
          ipAddress: req.ip||null,
          userAgent: req.headers["user-agent"]||null,
        },
      });
    });

    return res.json({
      success: true,
      message: "Return ສຳເລັດ ສົ່ງກັບໃຫ້ CO ແກ້ໄຂ",
      data: {
        applicationId: Number(id),
        step: "PENDING_VERIFIER",
        status: "RETURNED",
      },
    });
  } catch(err) {
    console.error("returnByVerifier Error:",err);
    return res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນການ Return",
    });
  }
};


// PUT /loan-applications/:id/returned
exports.returnedAndUpdate=async (req,res) => {
  const userId=req.user?.id;
  const id=Number(req.params.id);

  try {
    const old=await prisma.loanApplication.findUnique({
      where: {id},
      include: {assessment: true},
    });

    if(!old) {
      return res.status(404).json({success: false,message: "ບໍ່ພົບຄຳຂໍກູ້"});
    }

    if(old.status!=="RETURNED") {
      return res.status(400).json({
        success: false,
        message: "ສາມາດແກ້ໄຂໄດ້ເຉພາະຄຳຂໍທີ່ຖືກ RETURNED ເທົ່ານັ້ນ",
      });
    }

    if(req.user.role!=="CREDIT_OFFICER") {
      return res.status(403).json({
        success: false,
        message: "ທ່ານບໍ່ມີສິດແກ້ໄຂຄຳຂໍນີ້ (ຕ້ອງເປັນ CREDIT_OFFICER)",
      });
    }

    // บังคับ preparerComments (อธิบายการแก้)
    const {preparerComments,...otherFields}=req.body;

    if(!preparerComments||!preparerComments.trim()) {
      return res.status(400).json({
        success: false,
        message: "ກະລຸນາອະທິບາຍການແກ້ໄຂ (preparerComments) ກ່ອນບັນທຶກ",
      });
    }

    // Allowed fields สำหรับ LoanApplication
    const allow=[
      "loanPurpose",
      "loanAmountRequested",
      "termMonths",
      "interestRatePa",
      "repaymentMode",
      "processingFeesPercent",
      "collateralFeesPercent",
      "otherFeesPercent",
      "evidenceOfIncome",
      "evidenceOfIncomeType",
      "loanType",
      "customerType",
      "documentLinks",
    ];

    const patch={};
    for(const k of allow) {
      if(otherFields[k]!==undefined) patch[k]=otherFields[k];
    }

    const updated=await prisma.$transaction(async (tx) => {
      // อัปเดต LoanApplication
      const newApp=await tx.loanApplication.update({
        where: {id},
        data: {
          ...patch,
          termMonths: patch.termMonths!=null? Number(patch.termMonths):undefined,
          loanAmountRequested: patch.loanAmountRequested!=null? Number(patch.loanAmountRequested):undefined,
          interestRatePa: patch.interestRatePa!=null? Number(patch.interestRatePa):undefined,
          processingFeesPercent: patch.processingFeesPercent!=null? Number(patch.processingFeesPercent):undefined,
          collateralFeesPercent: patch.collateralFeesPercent!=null? Number(patch.collateralFeesPercent):undefined,
          otherFeesPercent: patch.otherFeesPercent!=null? Number(patch.otherFeesPercent):undefined,
          documentLinks: patch.documentLinks?.trim()||null,
          updatedAt: new Date(),
        },
      });

      // อัปเดต preparerComments ใน Assessment (บังคับมี)
      if(old.assessment) {
        await tx.assessment.update({
          where: {applicationId: id},
          data: {
            preparerComments: preparerComments.trim(),
            updatedAt: new Date(),
          },
        });
      }

      // ApprovalHistory: บันทึกว่าแก้ตาม return แล้ว
      await tx.approvalHistory.create({
        data: {
          assessmentId: old.assessment?.id,
          approverId: userId,
          level: "CO_UPDATE_AFTER_RETURN",
          status: "UPDATED",
          comments: `ແກ້ໄຂຕາມຄຳແນະນຳ: ${preparerComments.trim()}`,
          approvedAt: new Date(),
        },
      });

      // Audit log
      await writeAuditLog({
        tx,
        req,
        userId,
        action: "UPDATE_AFTER_RETURNED",
        entityType: "LoanApplication",
        entityId: id,
        oldValue: {status: old.status,preparerComments: old.assessment?.preparerComments},
        newValue: {preparerComments: preparerComments.trim()},
        description: `CO ແກ້ໄຂຄຳຂໍຫຼັງ RETURNED (id=${id})`,
      });

      return newApp;
    });

    const full=await prisma.loanApplication.findUnique({
      where: {id},
      include: {borrower: true,assessment: true},
    });

    return res.json({success: true,message: "ແກ້ໄຂສຳເລັດ",data: full});
  } catch(err) {
    console.error("ReturnedAndUpdate Error:",err);
    return res.status(500).json({success: false,message: err.message||"ເກີດຂໍ້ຜິດພາດ"});
  }
};



exports.getLoanReport=async (req,res) => {
  try {
    const {
      q="",
      status="",
      createdFrom="",
      createdTo="",
      loanType="",
      customerType="",
      page="1",
      limit="20",
    }=req.query;

    const pageNum=parseInt(page,10);
    const limitNum=parseInt(limit,20);
    if(isNaN(pageNum)||pageNum<1) return res.status(400).json({success: false,message: "page ຕ້ອງ >= 1"});
    if(isNaN(limitNum)||limitNum<1||limitNum>100) return res.status(400).json({success: false,message: "limit ຕ້ອງຢູ່ໃນເຂດ 1-100"});

    const skip=(pageNum-1)*limitNum;

    const where={};

    // Status
    if(status&&status!=="ALL") {
      where.status=status.toUpperCase();
    }

    // Search
    if(q.trim()) {
      const search=q.trim();
      where.OR=[
        {id: {equals: Number.isNaN(Number(search))? undefined:Number(search)}},
        {loanPurpose: {contains: search,mode: "insensitive"}},
        {
          borrower: {
            OR: [
              {firstName: {contains: search,mode: "insensitive"}},
              {lastName: {contains: search,mode: "insensitive"}},
              {phone: {contains: search}},
            ],
          },
        },
      ];
    }

    // Submitted Date Range (ใช้ submittedAt แทน createdAt)
    where.submittedAt={};
    const thirtyDaysAgo=new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate()-30);

    where.submittedAt.gte=createdFrom? new Date(createdFrom):thirtyDaysAgo;
    if(createdTo) {
      const toDate=new Date(createdTo);
      toDate.setHours(23,59,59,999);
      where.submittedAt.lte=toDate;
    }

    // Loan Type
    if(loanType&&loanType!=="ALL") {
      where.loanType=loanType;
    }

    // Customer Type
    if(customerType&&customerType!=="ALL") {
      where.customerType=customerType;
    }

    // Query
    const [applications,total]=await Promise.all([
      prisma.loanApplication.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: {updatedAt: "desc"},
        include: {
          borrower: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          assessment: {
            select: {
              dtiRatio: true,
              maxApprovedAmount: true,
              installmentAmount: true,
              processingFeeAmount: true,
              verifierComments: true,
              currentApprovalStep: true,
            },
          },
        },
      }),
      prisma.loanApplication.count({where}),
    ]);

    const stats={
      total,
      pending: await prisma.loanApplication.count({where: {...where,status: "PENDING"}}),
      pendingVerifier: await prisma.loanApplication.count({where: {...where,status: "PENDING_VERIFIER"}}),
      returned: await prisma.loanApplication.count({where: {...where,status: "RETURNED"}}),
      approved: await prisma.loanApplication.count({where: {...where,status: "APPROVED"}}),
    };

    res.json({
      success: true,
      data: applications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total/limitNum),
      },
      stats,
    });
  } catch(err) {
    console.error("getLoanReport Error:",err);
    res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນການດຶງລາຍງານ",
    });
  }
};



// controllers/loanApplicationController.js
exports.getMyActivityHistory=async (req,res) => {
  try {
    const userId=req.user.id;

    const {
      q="",
      status="ALL", // ALL, PENDING_VERIFIER, RETURNED, APPROVED, REJECTED
      startDate,
      endDate,
      page=1,
      limit=15,
    }=req.query;

    const pageNum=Math.max(1,Number(page));
    const limitNum=Math.min(50,Math.max(1,Number(limit)));

    // 1) filter: เคสที่ฉันเคยเกี่ยวข้องจริง
    const involvementFilter={
      OR: [
        {assessment: {verifierId: userId}},
        {assessment: {dcoId: userId}},
        {assessment: {ceoId: userId}},
        {assessment: {approvalHistory: {some: {approverId: userId}}}},
      ],
    };

    // 2) filter: คำค้น (ถ้ามี) — อย่าไป push ใส่ OR เดียวกัน
    let searchFilter={};
    if(q.trim()) {
      const search=q.trim();
      const maybeId=Number(search);
      const idPart=Number.isFinite(maybeId)? [{id: maybeId}]:[];

      searchFilter={
        OR: [
          ...idPart,
          {loanPurpose: {contains: search,mode: "insensitive"}},
          {
            borrower: {
              OR: [
                {laoFirstName: {contains: search,mode: "insensitive"}},
                {laoLastName: {contains: search,mode: "insensitive"}},
                {firstName: {contains: search,mode: "insensitive"}},
                {lastName: {contains: search,mode: "insensitive"}},
                {phone: {contains: search}},
              ],
            },
          },
        ],
      };
    }

    // 3) filter: วันที่ (updatedAt)
    let dateFilter={};
    if(startDate||endDate) {
      dateFilter.updatedAt={};
      if(startDate) dateFilter.updatedAt.gte=new Date(startDate);
      if(endDate) {
        const end=new Date(endDate);
        end.setHours(23,59,59,999);
        dateFilter.updatedAt.lte=end;
      }
    }

    // 4) รวม filter แบบ AND
    const baseWhere={
      AND: [involvementFilter,searchFilter,dateFilter].filter(
        (x) => x&&Object.keys(x).length>0
      ),
    };

    // 5) status filter (ถ้าระบุ)
    const where=
      status&&status!=="ALL"
        ? {AND: [baseWhere,{status}]}
        :baseWhere;

    const [activities,total]=await Promise.all([
      prisma.loanApplication.findMany({
        where,
        include: {
          borrower: {
            select: {
              laoFirstName: true,
              laoLastName: true,
              phone: true,
            },
          },
          assessment: {
            select: {
              currentApprovalStep: true,
              verifierComments: true,
              verifierId: true,
              dcoComments: true,
              dcoId: true,
              ceoComments: true,
              ceoId: true,
              approvalHistory: {
                where: {approverId: userId},
                select: {
                  level: true,
                  status: true,
                  comments: true,
                  approvedAt: true,
                },
                orderBy: {approvedAt: "desc"},
                take: 1, // ✅ action ล่าสุดของฉันในเคสนี้
              },
            },
          },
        },
        orderBy: {updatedAt: "desc"},
        skip: (pageNum-1)*limitNum,
        take: limitNum,
      }),
      prisma.loanApplication.count({where}),
    ]);

    const formatted=activities.map((app) => ({
      ...app,
      myLastAction: app.assessment?.approvalHistory?.[0]||null,
      statusLabel: getStatusLabel(app.status),
    }));

    return res.json({
      success: true,
      data: formatted,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total/limitNum),
      },
    });
  } catch(err) {
    console.error("getMyActivityHistory Error:",err);
    return res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ",
    });
  }
};

const getStatusLabel=(status) => {
  const labels={
    PENDING_VERIFIER: "ລໍຖ້າກວດສອບ",
    RETURNED: "ສົ່ງກັບແກ້ໄຂ",
    APPROVED: "ອະນຸມັດແລ້ວ",
    REJECTED: "ປະຕິເສດ",
  };
  return labels[status]||status;
};



exports.getFullLoanReport=async (req,res) => {
  try {
    const id=Number(req.params.id);
    if(Number.isNaN(id)) {
      return res.status(400).json({success: false,message: "ID ไม่ถูกต้อง"});
    }

    const loan=await prisma.loanApplication.findUnique({
      where: {id},
      include: {
        borrower: {
          include: {
            sector: true,
          },
        },


        assessment: {
          include: {
            verifier: {
              select: {
                id: true,
                username: true,
                fullName: true,
                signatureUrl: true,
              },
            },
            dco: {
              select: {
                id: true,
                username: true,
                fullName: true,
                signatureUrl: true,
              },
            },
            ceo: {
              select: {
                id: true,
                username: true,
                fullName: true,
                signatureUrl: true,
              },
            },
            assessedBy: {
              select: {
                id: true,
                username: true,
                fullName: true,
                signatureUrl: true,
              },
            },
            approvalHistory: {
              orderBy: {approvedAt: 'asc'},
              include: {
                approver: {
                  select: {
                    id: true,
                    username: true,
                    fullName: true,
                    signatureUrl: true,
                  },
                },
              },
            },
          },
        },


      },
    });

    if(!loan) {
      return res.status(404).json({success: false,message: "ไม่พบ Loan Application"});
    }

    if(loan.status!=="APPROVED"||loan.assessment?.currentApprovalStep!=="APPROVED") {
      return res.status(400).json({
        success: false,
        message: "Loan Application นี้ยังไม่ผ่านการอนุมัติโดย CEO หรือยังไม่สิ้นสุดกระบวนการ",
      });
    }

    return res.json({
      success: true,
      data: loan,
      // ถ้าต้องการส่งข้อมูลสรุปเพิ่มเติม
      summary: {
        loanId: loan.id,
        borrowerName: `${loan.borrower?.laoFirstName||''} ${loan.borrower?.laoLastName||''}`,
        status: loan.status,
        approvedByCEOAt: loan.assessment?.ceo?.approvedAt||null,
        totalPayments: loan.payments?.length||0,
      },
    });
  } catch(err) {
    console.error("GetFullLoanReport Error:",err);
    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในระบบ",
    });
  }
};



exports.exportLoanReportExcel=async (req,res) => {
  try {
    const id=Number(req.params.id);

    const loan=await prisma.loanApplication.findUnique({
      where: {id},
      include: {borrower: true,assessment: true},
    });

    if(!loan||loan.status!=="APPROVED") {
      return res.status(400).json({success: false,message: "ไม่สามารถ export ได้"});
    }

    const workbook=new ExcelJS.Workbook();
    const worksheet=workbook.addWorksheet("Loan Report");

    worksheet.addRow(["ເລກທີ່ຄຳຂໍ",loan.id]);
    worksheet.addRow(["ຊື່ຜູ້ກູ້",`${loan.borrower.laoFirstName} ${loan.borrower.laoLastName}`]);
    worksheet.addRow(["ຈຳນວນກູ້",String(loan.loanAmountRequested||0)]);

    const buffer=await workbook.xlsx.writeBuffer();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="loan-report-${loan.id}.xlsx"`
    );

    return res.status(200).send(Buffer.from(buffer));
  } catch(err) {
    console.error("Export Excel Error:",err);
    return res.status(500).json({success: false,message: "Export ล้มเหลว"});
  }
};
