const {PrismaClient}=require("@prisma/client");
const prisma=new PrismaClient();
function buildMonthlyRanges(start,end) {
  const ranges=[];
  const startMonth=new Date(start.getFullYear(),start.getMonth(),1);
  const endMonth=new Date(end.getFullYear(),end.getMonth(),1);

  let cur=startMonth;
  while(cur<=endMonth) {
    const next=new Date(cur.getFullYear(),cur.getMonth()+1,1);
    ranges.push({
      start: new Date(cur),
      end: next,
      label: cur.toLocaleString("lo-LA",{month: "short",year: "numeric"}),
    });
    cur=next;
  }
  return ranges;
}
exports.approvedLoanTypesSummary=async (req,res) => {
  try {
    // ถ้าต้องการ filter วันที่ (optional)
    // const { startDate, endDate } = req.query;
    // const end = endDate ? new Date(endDate) : new Date();
    // const start = startDate ? new Date(startDate) : new Date(end.getFullYear(), end.getMonth() - 11, 1);

    const summary=await prisma.loanApplication.groupBy({
      by: ["loanType"],
      _count: {id: true},
      where: {
        status: "APPROVED", // ✅ เอาเฉพาะอนุมัติแล้ว
        loanType: {
          in: ["PERSONAL_SALARY_GUARANTEE","PERSONAL_WITH_COLLATERAL","BUSINESS"],
        },
        // submittedAt: { gte: start, lte: end }, // (ถ้าจะ filter วันที่)
      },
    });

    const types={
      PERSONAL_SALARY_GUARANTEE: "ສິນເຊື່ອບຸກຄົນທີ່ມີເງິນເດືອນຄໍ້າປະກັນ",
      PERSONAL_WITH_COLLATERAL: "ສິນເຊື່ອບຸກຄົນທີ່ມີຫຼັກຊັບຄໍ້າປະກັນ",
      BUSINESS: "ສິນເຊື່ອທຸລະກິດ",
    };

    // ทำให้ครบ 3 ประเภทเสมอ (แม้ count = 0)
    const allTypes=["PERSONAL_SALARY_GUARANTEE","PERSONAL_WITH_COLLATERAL","BUSINESS"];
    const mapCount=new Map(summary.map(x => [x.loanType,x._count.id]));

    const result=allTypes.map(t => ({
      type: t,
      label: types[t]||t,
      count: mapCount.get(t)||0,
    }));

    const total=result.reduce((sum,item) => sum+item.count,0);

    const chartData=result.map(item => ({
      ...item,
      percentage: total>0? ((item.count/total)*100).toFixed(1):"0.0",
    }));

    return res.json({
      success: true,
      data: chartData,
      totalApprovedApplications: total,
      status: "APPROVED",
      message: "ດຶງຂໍ້ມູນຈຳນວນຄຳຂໍອະນຸມັດແລ້ວ ແຍກຕາມປະເພດສິນເຊື່ອ",
    });
  } catch(err) {
    console.error("Approved Loan Types Summary Error:",err);
    return res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນການດຶງຂໍ້ມູນແດຊບອດ",
    });
  }
};

exports.loanTypesSummary=async (req,res) => {
  try {
    const summary=await prisma.loanApplication.groupBy({
      by: ["loanType"],
      _count: {
        id: true,
      },
      where: {
        loanType: {
          in: [
            "PERSONAL_SALARY_GUARANTEE",
            "PERSONAL_WITH_COLLATERAL",
            "BUSINESS",
          ],
        },
      },
    });

    // ຊື່ສະແດງ
    const types={
      PERSONAL_SALARY_GUARANTEE:
        "ສິນເຊື່ອບຸກຄົນທີ່ມີເງິນເດືອນຄໍ້າປະກັນ",
      PERSONAL_WITH_COLLATERAL:
        "ສິນເຊື່ອບຸກຄົນທີ່ມີຫຼັກຊັບຄໍ້າປະກັນ",
      BUSINESS: "ສິນເຊື່ອທຸລະກິດ",
    };

    // ກຳນົດລຳດັບໃຫ້ຄົງທີ່
    const allTypes=[
      "PERSONAL_SALARY_GUARANTEE",
      "PERSONAL_WITH_COLLATERAL",
      "BUSINESS",
    ];

    // ແປງ summary -> Map
    const mapCount=new Map(
      summary.map((item) => [item.loanType,item._count.id])
    );

    // ສ້າງ result ໃຫ້ຄົບທັງ 3 Type
    const result=allTypes.map((type) => ({
      type,
      label: types[type]||type,
      count: mapCount.get(type)||0,
    }));

    // ຄຳນວນຍອດລວມ
    const total=result.reduce((sum,item) => sum+item.count,0);

    // ຄຳນວນ %
    const chartData=result.map((item) => ({
      ...item,
      percentage:
        total>0
          ? ((item.count/total)*100).toFixed(1)
          :"0.0",
    }));

    return res.json({
      success: true,
      data: chartData,
      totalApplications: total,
      message: "ດຳເນີນການດຶງຂໍ້ມູນ Dashboard ສຳເລັດ",
    });
  } catch(err) {
    console.error("Loan Types Summary Error:",err);

    return res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນການດຶງຂໍ້ມູນ Dashboard",
    });
  }
};

exports.monthlyApplications=async (req,res) => {
  try {
    const {startDate,endDate}=req.query;

    // กำหนดช่วงเวลา default: ย้อนหลัง 12 เดือน
    const end=endDate? new Date(endDate):new Date();
    const start=startDate
      ? new Date(startDate)
      :new Date(end.getFullYear(),end.getMonth()-11,1); // ย้อนหลัง 12 เดือน

    // สร้างรายเดือนทั้งหมดในช่วงเวลา
    const months=[];
    let current=new Date(start.getFullYear(),start.getMonth(),1);
    while(current<=end) {
      months.push({
        year: current.getFullYear(),
        month: current.getMonth()+1, // 1-12
        monthName: current.toLocaleString('lo-LA',{month: 'short',year: 'numeric'}),
      });
      current.setMonth(current.getMonth()+1);
    }

    // ดึงข้อมูลจริงจากฐานข้อมูล
    const rawData=await prisma.loanApplication.groupBy({
      by: ['loanType','submittedAt'],
      _count: {id: true},
      where: {
        submittedAt: {
          gte: start,
          lte: end,
        },
        loanType: {
          in: [
            'PERSONAL_SALARY_GUARANTEE',
            'PERSONAL_WITH_COLLATERAL',
            'BUSINESS',
          ],
        },
      },
      orderBy: {submittedAt: 'asc'},
    });

    // แปลงข้อมูลให้เป็นรายเดือน + แยกประเภท
    const monthlyMap=new Map();

    // เตรียมโครงสร้างทุกเดือน
    months.forEach(m => {
      const key=`${m.year}-${String(m.month).padStart(2,'0')}`;
      monthlyMap.set(key,{
        month: m.monthName,
        total: 0,
        PERSONAL_SALARY_GUARANTEE: 0,
        PERSONAL_WITH_COLLATERAL: 0,
        BUSINESS: 0,
      });
    });

    // นับจำนวนจริง
    rawData.forEach(item => {
      const date=new Date(item.submittedAt);
      const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
      if(monthlyMap.has(key)) {
        const entry=monthlyMap.get(key);
        entry.total+=item._count.id;
        entry[item.loanType]+=item._count.id;
      }
    });

    // แปลงเป็น array สำหรับกราฟ
    const chartData=Array.from(monthlyMap.values());

    return res.json({
      success: true,
      data: chartData,
      totalApplications: chartData.reduce((sum,m) => sum+m.total,0),
      period: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      },
      message: 'ດຳເນີນການດຶງຂໍ້ມູນສະເໜີໃນລະດູບາດສຳເລັດ',
    });
  } catch(err) {
    console.error('Monthly Applications Error:',err);
    return res.status(500).json({
      success: false,
      message: 'ເກີດຂໍ້ຜິດພາດໃນການດึงຂໍ້ມູນແດຊບອດ',
    });
  }
};

exports.approvalStatusMonthly=async (req,res) => {
  try {
    const {startDate,endDate}=req.query;

    const end=endDate? new Date(endDate):new Date();
    const start=startDate? new Date(startDate):new Date(end.getFullYear(),end.getMonth()-11,1);

    const ranges=buildMonthlyRanges(start,end);

    const data=[];
    for(const r of ranges) {
      const grouped=await prisma.assessment.groupBy({
        by: ["finalApprovalStatus"],
        _count: {id: true},
        where: {
          application: {submittedAt: {gte: r.start,lt: r.end}},
        },
      });

      const row={
        month: r.label,
        total: 0,
        APPROVED: 0,
        PENDING: 0,
        REJECTED: 0,
        RETURNED: 0,
      };

      for(const g of grouped) {
        const s=g.finalApprovalStatus;
        const c=g._count.id;

        row.total+=c;

        if(s==="APPROVED") row.APPROVED+=c;
        else if(s==="REJECTED") row.REJECTED+=c;
        else if(s==="RETURNED") row.RETURNED+=c;
        else if(s==="PENDING"||s==="PENDING_VERIFIER"||s==="PENDING_DCO"||s==="PENDING_CEO") {
          row.PENDING+=c; // รวม pending ทั้งหมด
        }
      }

      data.push(row);
    }

    return res.json({
      success: true,
      data,
      totalApplications: data.reduce((s,r) => s+r.total,0),
      period: {start: start.toISOString().slice(0,10),end: end.toISOString().slice(0,10)},
      message: "ດຶງຂໍ້ມູນສຳເລັດ",
    });
  } catch(err) {
    console.error("Approval Status Monthly Error:",err);
    return res.status(500).json({success: false,message: "ເກີດຂໍ້ຜິດພາດໃນການດຶງຂໍ້ມູນລະດູບາດ"});
  }
};


exports.approvalStatusSummary=async (req,res) => {
  try {
    const summary=await prisma.loanApplication.groupBy({
      by: ["status"],
      _count: {
        id: true,
      },
    });

    let pendingCount=0;
    const mapCount=new Map();

    summary.forEach((item) => {
      // ລວມສະຖານະ PENDING ທັງໝົດ
      if(item.status.startsWith("PENDING")) {
        pendingCount+=item._count.id;
      } else {
        mapCount.set(item.status,item._count.id);
      }
    });

    mapCount.set("PENDING",pendingCount);

    const statusLabels={
      PENDING: "ລໍຖ້າອະນຸມັດ",
      APPROVED: "ອະນຸມັດແລ້ວ",
      REJECTED: "ປະຕິເສດ",
      RETURNED: "ສົ່ງກັບແກ້ໄຂ",
      DISBURSED: "ເບີກຈ່າຍແລ້ວ",
      CLOSED: "ປິດສັນຍາ",
      OVERDUE: "ຄ້າງຊຳລະ",
    };

    // ລຳດັບທີ່ຕ້ອງການໃນ Dashboard
    const allStatus=[
      "PENDING",
      "APPROVED",
      "DISBURSED",
      "CLOSED",
      "OVERDUE",
      "RETURNED",
      "REJECTED",
    ];

    const result=allStatus.map((status) => ({
      status,
      label: statusLabels[status],
      count: mapCount.get(status)||0,
    }));

    const total=result.reduce((sum,item) => sum+item.count,0);

    const chartData=result.map((item) => ({
      ...item,
      percentage:
        total>0
          ? ((item.count/total)*100).toFixed(1)
          :"0.0",
    }));

    return res.json({
      success: true,
      data: chartData,
      totalApplications: total,
      message: "ດຶງຂໍ້ມູນສະຖານະສຳເລັດ",
    });
  } catch(err) {
    console.error("Approval Status Summary Error:",err);

    return res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນການດຶງຂໍ້ມູນ Dashboard",
    });
  }
};

// exports.approvalStatusSummary = async (req, res) => {
//   try {
//     const { startDate, endDate } = req.query;

//     const end = endDate ? new Date(endDate) : new Date();
//     const start = startDate ? new Date(startDate) : new Date(end.getFullYear(), end.getMonth() - 11, 1);

//     const grouped = await prisma.assessment.groupBy({
//       by: ["finalApprovalStatus"],
//       _count: { id: true },
//       where: {
//         application: {
//           submittedAt: { gte: start, lte: end },
//         },
//       },
//     });

//     const statusLabels = {
//       APPROVED: "ອະນຸມັດແລ້ວ",
//       PENDING_VERIFIER: "ລໍຖ້າຜູ້ກວດສອບ",
//       PENDING_DCO: "ລໍຖ້າ DCO",
//       PENDING_CEO: "ລໍຖ້າ CEO",
//       PENDING: "ລໍຖ້າການກວດສອບ",
//       REJECTED: "ປະຕິເສດ",
//       RETURNED: "ສົ່ງກັບໄປແກ້ໄຂ",
//       DISBURSED: "ຈ່າຍເງິນແລ້ວ",
//       CLOSED: "ປິດບັນຊີ",
//       OVERDUE: "ເກີນກຳນົດ",
//     };

//     // แปลงผลลัพธ์
//     const result = grouped.map(g => ({
//       status: g.finalApprovalStatus,
//       label: statusLabels[g.finalApprovalStatus] || g.finalApprovalStatus,
//       count: g._count.id,
//     }));

//     // เรียงตามลำดับที่ต้องการ
//     const statusOrder = ["APPROVED", "PENDING_VERIFIER", "PENDING_DCO", "PENDING_CEO", "PENDING", "REJECTED", "RETURNED"];
//     result.sort((a, b) => {
//       const ai = statusOrder.indexOf(a.status);
//       const bi = statusOrder.indexOf(b.status);
//       return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
//     });

//     const total = result.reduce((sum, x) => sum + x.count, 0);
//     const chartData = result.map(x => ({
//       ...x,
//       percentage: total > 0 ? ((x.count / total) * 100).toFixed(1) : "0.0",
//     }));

//     return res.json({
//       success: true,
//       data: chartData,
//       totalApplications: total,
//       period: { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) },
//       message: "ດຶງຂໍ້ມູນສະຖານະການອະນຸມັດສຳເລັດ",
//     });
//   } catch (err) {
//     console.error("Approval Status Summary Error:", err);
//     return res.status(500).json({ success: false, message: "ເກີດຂໍ້ຜິດພາດໃນການດຶງຂໍ້ມູນແດຊບອດ" });
//   }
// };
