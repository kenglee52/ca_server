// controllers/borrowers.js
const {PrismaClient,Prisma}=require("@prisma/client");
const prisma=new PrismaClient();

// Helper functions (เหมือนเดิม)
const toNumber=(v,def=null) => {
  if(v===undefined||v===null||v==="") return def;
  const n=Number(v);
  return Number.isFinite(n)? n:def;
};

const toDecimal=(v,def="0") => {
  const n=toNumber(v,null);
  return n===null? new Prisma.Decimal(def):new Prisma.Decimal(n);
};

/**
 * CREATE Borrower
 */
exports.createBorrower=async (req,res) => {
  const userId=req.user.id;

  try {
    const data=req.body;

    // Required fields (เพิ่ม laoFirstName/laoLastName ตาม schema ใหม่)
    if(!data.laoFirstName||!data.laoLastName||!data.firstName||!data.lastName||!data.age) {
      return res.status(400).json({
        success: false,
        message: "ຊື່ລາວ, ນາມສະກຸນລາວ, ຊື່ອັງກິດ, ນາມສະກຸນອັງກິດ ແລະ ອາຍຸ ຕ້ອງການ",
      });
    }

    const borrowerData={
      title: data.title||"THAO",
      laoFirstName: data.laoFirstName.trim(),
      laoLastName: data.laoLastName.trim(),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      age: Number(data.age),
      maritalStatus: data.maritalStatus||null,
      nationality: data.nationality?.trim()||"Lao",
      education: data.education?.trim()||null,
      occupation: data.occupation?.trim()||null,
      employerName: data.employerName?.trim()||null,
      position: data.position?.trim()||null,
      workingStartDate: data.workingStartDate? new Date(data.workingStartDate):null,
      phone: data.phone?.trim()||null,
      village: data.village?.trim()||null,
      certificateType: data.certificateType?.trim()||null,
      certificateNo: data.certificateNo?.trim()||null,
      idCardExpiryDate: data.idCardExpiryDate? new Date(data.idCardExpiryDate):null,
      dateOfBirth: data.dateOfBirth? new Date(data.dateOfBirth):null,
      currentAddressLink: data.currentAddressLink?.trim()||null,
      monthlySalary: data.monthlySalary? toDecimal(data.monthlySalary):new Prisma.Decimal(0),
      householdExpense: data.householdExpense? toDecimal(data.householdExpense):new Prisma.Decimal(0),
      netIncome: data.netIncome? toDecimal(data.netIncome):new Prisma.Decimal(0),
      relationshipWithFina: data.relationshipWithFina?.trim()||"No relationship",
      businessRegistrationNumber: data.businessRegistrationNumber?.trim()||null,
      businessRegisterName: data.businessRegisterName?.trim()||null,
      businessVillage: data.businessVillage?.trim()||null,
      businessAddressLink: data.businessAddressLink?.trim()||null,
      businessPhone: data.businessPhone?.trim()||null,
      businessType: data.businessType?.trim()||null,
      employeeCount: data.employeeCount? Number(data.employeeCount):null,
      companyVillage: data.companyVillage?.trim()||null,
      companyAddressLink: data.companyAddressLink?.trim()||null,
      companyPhone: data.companyPhone?.trim()||null,

      // เพิ่ม sectorId (optional แต่ถ้าส่งมาจะ connect)
      ...(data.sectorId? {sector: {connect: {id: Number(data.sectorId)}}}:{}),

      // เชื่อม relation ด้วย connect (เหมือนเดิม)
      ...(data.provinceId? {province: {connect: {id: Number(data.provinceId)}}}:{}),
      ...(data.districtId? {district: {connect: {id: Number(data.districtId)}}}:{}),
      companyProvinceId: data.companyProvinceId? Number(data.companyProvinceId):null,
      companyDistrictId: data.companyDistrictId? Number(data.companyDistrictId):null,
      ...(data.businessProvinceId? {businessProvince: {connect: {id: Number(data.businessProvinceId)}}}:{}),
      ...(data.businessDistrictId? {businessDistrict: {connect: {id: Number(data.businessDistrictId)}}}:{}),
    };

    // Validation เพิ่มเติม (เหมือนเดิม)
    if(isNaN(borrowerData.age)||borrowerData.age<18) {
      return res.status(400).json({
        success: false,
        message: "ອາຍຸຕ້ອງເປັນຕົວເລກ ແລະ ບໍ່ນ້ອຍກວ່າ 18 ປີ",
      });
    }

    // Validation เพิ่มเติมสำหรับ sectorId (ถ้าส่งมา ต้องมีจริง)
    if(data.sectorId) {
      const sectorExists=await prisma.sector.findUnique({
        where: {id: Number(data.sectorId)},
      });
      if(!sectorExists) {
        return res.status(400).json({
          success: false,
          message: "ປະເພດທຸລະກິດ (Sector) ທີ່ເລືອກບໍ່ມີໃນລະບົບ",
        });
      }
    }

    // ກວດສອບເບີໂທລະສັບຊໍ້າ
    if(data.phone) {
      const phoneExists=await prisma.borrower.findFirst({  // ✅ ເພີ່ມ await
        where: {phone: data.phone}
      });
      if(phoneExists) return res.status(409).json({         // ✅ 409
        success: false,
        message: "ເບີໂທລະສັບນີ້ມີໃນລະບົບແລ້ວ"
      });
    }

    // ກວດສອບເລກບັດປະຈຳຕົວຊໍ້າກັນ
    if(data.certificateType && data.certificateNo) {        // ✅ guard null
      const CERTIFICATE_LABELS={
        ID_CARD: "ບັດປະຈຳຕົວ",
        PASSPORT: "ພາສປອດ",
        FAMILY_BOOK: "ສຳມະໂນຄົວ",
      };

      const certificateNoExists=await prisma.borrower.findFirst({
        where: {
          certificateType: data.certificateType,
          certificateNo: data.certificateNo,
        },
      });

      if(certificateNoExists) {
        const certificate=CERTIFICATE_LABELS[data.certificateType]??data.certificateType;
        return res.status(409).json({                        // ✅ 409
          success: false,
          message: `ເລກທີ (${certificate}) ນີ້ມີໃນລະບົບແລ້ວ`,
        });
      }
    }

    const borrower=await prisma.borrower.create({
      data: borrowerData,
    });

    // Audit Log (เหมือนเดิม)
    await prisma.auditLog.create({
      data: {
        userId,
        action: "CREATE",
        entityType: "Borrower",
        entityId: borrower.id,
        newValue: borrower,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        description: `ສ້າງຜູ້ກູ້ໃໝ່: ${borrower.laoFirstName} ${borrower.laoLastName} (${borrower.firstName} ${borrower.lastName})`,
      },
    });

    return res.status(201).json({
      success: true,
      message: "ເພີ່ມຜູ້ກູ້ສຳເລັດ",
      data: borrower,
    });
  } catch(err) {
    console.error("CreateBorrower Error:",err);
    return res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ",
    });
  }
};

/**
 * UPDATE Borrower
 */
exports.updateBorrower=async (req,res) => {
  const userId=req.user.id;
  const borrowerId=Number(req.params.id);

  try {
    const oldBorrower=await prisma.borrower.findUnique({
      where: {id: borrowerId},
    });

    if(!oldBorrower) {
      return res.status(404).json({
        success: false,
        message: "ບໍ່ພົບຂໍ້ມູນຜູ້ກູ້",
      });
    }

    const updateData={...req.body};

    // Trim string fields (เหมือนเดิม)
    const stringFields=[
      'laoFirstName','laoLastName','firstName','lastName','phone','village',
      'certificateNo','relationshipWithFina','education','occupation',
      'employerName','position','businessVillage',
      'companyVillage','companyAddressLink','companyPhone',
      'businessAddressLink','businessPhone','businessRegisterName','businessType'
    ];

    stringFields.forEach(field => {
      if(updateData[field]!==undefined) {
        updateData[field]=String(updateData[field]).trim();
        if(updateData[field]==='') updateData[field]=null;
      }
    });

    // Validate numeric fields (เหมือนเดิม)
    const numericFields={
      age: {min: 18,message: "ອາຍຸຕ້ອງບໍ່ນ້ອຍກວ່າ 18 ປີ"},
      monthlySalary: {min: 0,message: "ເງິນເດືອນເດືອນບໍ່ສາມາດຕິດລົບ"},
      householdExpense: {min: 0,message: "ຄ່າຄອບຄົວບໍ່ສາມາດຕິດລົບ"},
      netIncome: {min: 0,message: "ລາຍໄດ້ສຸດທິບໍ່ສາມາດຕິດລົບ"},
      employeeCount: {min: 0,message: "ຈຳນວນພະນັກງານບໍ່ສາມາດຕິດລົບ"},
    };

    for(const [field,config] of Object.entries(numericFields)) {
      if(updateData[field]!==undefined) {
        const value=Number(updateData[field]);
        if(isNaN(value)) {
          return res.status(400).json({
            success: false,
            message: `${field} ຕ້ອງເປັນຕົວເລກ`,
          });
        }
        if(value<config.min) {
          return res.status(400).json({
            success: false,
            message: config.message,
          });
        }
        updateData[field]=value;
      }
    }

    // จัดการวันที่ (เหมือนเดิม)
    ['workingStartDate','dateOfBirth','idCardExpiryDate'].forEach(field => {
      if(updateData[field]!==undefined) {
        if(updateData[field]) {
          const date=new Date(updateData[field]);
          if(isNaN(date.getTime())) {
            return res.status(400).json({
              success: false,
              message: `${field} ບໍ່ຖືກຕ້ອງ (ຮູບແບບ YYYY-MM-DD)`,
            });
          }
          updateData[field]=date;
        } else {
          updateData[field]=null;
        }
      }
    });

    // จัดการ relation fields ด้วย connect / disconnect (เหมือนเดิม + เพิ่ม sector)
    if('provinceId' in updateData) {
      updateData.province=updateData.provinceId? {connect: {id: Number(updateData.provinceId)}}:{disconnect: true};
      delete updateData.provinceId;
    }
    if('districtId' in updateData) {
      updateData.district=updateData.districtId? {connect: {id: Number(updateData.districtId)}}:{disconnect: true};
      delete updateData.districtId;
    }
    if('companyProvinceId' in updateData) {
      updateData.companyProvinceId=updateData.companyProvinceId? Number(updateData.companyProvinceId):null;
    }
    if('companyDistrictId' in updateData) {
      updateData.companyDistrictId=updateData.companyDistrictId? Number(updateData.companyDistrictId):null;
    }
    if('businessProvinceId' in updateData) {
      updateData.businessProvince=updateData.businessProvinceId? {connect: {id: Number(updateData.businessProvinceId)}}:{disconnect: true};
      delete updateData.businessProvinceId;
    }
    if('businessDistrictId' in updateData) {
      updateData.businessDistrict=updateData.businessDistrictId? {connect: {id: Number(updateData.businessDistrictId)}}:{disconnect: true};
      delete updateData.businessDistrictId;
    }

    // เพิ่มการจัดการ sectorId (optional)
    if('sectorId' in updateData) {
      if(updateData.sectorId) {
        const sectorExists=await prisma.sector.findUnique({
          where: {id: Number(updateData.sectorId)},
        });
        if(!sectorExists) {
          return res.status(400).json({
            success: false,
            message: "ປະເພດທຸລະກິດ (Sector) ທີ່ເລືອກບໍ່ມີໃນລະບົບ",
          });
        }
        updateData.sector={connect: {id: Number(updateData.sectorId)}};
      } else {
        updateData.sector={disconnect: true};
      }
      delete updateData.sectorId;
    }

    // ถ้าไม่มีข้อมูลให้อัพเดต
    if(Object.keys(updateData).length===0) {
      return res.status(400).json({
        success: false,
        message: "ບໍ່ມີຂໍ້ມູນໃຫ້ແກ້ໄຂ",
      });
    }

    const updated=await prisma.borrower.update({
      where: {id: borrowerId},
      data: updateData,
      include: {sector: true} // ดึง sector กลับมาแสดง
    });

    // Audit Log (เหมือนเดิม)
    const changedFields=Object.keys(req.body).join(", ");
    await prisma.auditLog.create({
      data: {
        userId,
        action: "UPDATE",
        entityType: "Borrower",
        entityId: borrowerId,
        oldValue: oldBorrower,
        newValue: updated,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        description: `ແກ້ໄຂຂໍ້ມູນຜູ້ກູ້: ${updated.laoFirstName} ${updated.laoLastName} (${updated.firstName} ${updated.lastName}) (field: ${changedFields})`,
      },
    });

    return res.json({
      success: true,
      message: "ແກ້ໄຂຂໍ້ມູນສຳເລັດ",
      data: updated,
    });
  } catch(err) {
    console.error("UpdateBorrower Error:",err);
    return res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ",
    });
  }
};

/**
 * GET Borrower by ID (include relations + sector)
 */
exports.getBorrowerById=async (req,res) => {
  try {
    const borrowerId=Number(req.params.id);

    const borrower=await prisma.borrower.findUnique({
      where: {id: borrowerId},
      include: {
        province: true,
        district: true,
        businessProvince: true,
        businessDistrict: true,
        sector: true, // เพิ่ม sector เข้ามา
        applications: true,
        incomes: true,
        externalLoans: true,
        businessIncomes: true,
      },
    });

    if(!borrower) {
      return res.status(404).json({
        success: false,
        message: "ບໍ່ພົບຂໍ້ມູນຜູ້ກູ້",
      });
    }

    return res.json({
      success: true,
      message: "ດຶງຂໍ້ມູນຜູ້ກູ້ສຳເລັດ",
      data: borrower,
    });
  } catch(err) {
    console.error("GetBorrowerById Error:",err);
    return res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ",
    });
  }
};

/**
 * GET Borrowers list with search & pagination
 * ?q=keyword&page=1&limit=10
 */
exports.getBorrowers=async (req,res) => {
  try {
    const {q,page=1,limit=10}=req.query;

    const where=q
      ? {
        OR: [
          {laoFirstName: {contains: q,mode: "insensitive"}},
          {laoLastName: {contains: q,mode: "insensitive"}},
          {firstName: {contains: q,mode: "insensitive"}},
          {lastName: {contains: q,mode: "insensitive"}},
          {phone: {contains: q}},
          {certificateNo: {contains: q}},
        ],
      }
      :{};

    const borrowers=await prisma.borrower.findMany({
      where,
      skip: (Number(page)-1)*Number(limit),
      take: Number(limit),
      orderBy: {createdAt: "desc"},
      include: {
        province: {select: {name: true}},
        district: {select: {name: true}},
        sector: {select: {sector: true,bolCode: true}}, // เพิ่ม sector
      },
    });

    const total=await prisma.borrower.count({where});

    return res.json({
      success: true,
      message: "ດຶງລາຍການຜູ້ກູ້ສຳເລັດ",
      data: borrowers,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total/limit),
      },
    });
  } catch(err) {
    console.error("GetBorrowers Error:",err);
    return res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ",
    });
  }
};


/**
 * DELETE Borrower
 * ເງື່ອນໄຂ: ຈະລົບໄດ້ກໍຕໍ່ເມື່ອບໍ່ມີ LoanApplication ຫຼື ມີແຕ່ໃບສະໝັກທີ່ສະຖານະເປັນ REJECTED ເທົ່ານັ້ນ
 */
exports.deleteBorrower=async (req,res) => {
  const userId=req.user.id;
  const borrowerId=Number(req.params.id);

  try {
    // 1. ກວດສອບວ່າພົບຂໍ້ມູນຜູ້ກູ້ຫຼືບໍ່
    const borrower=await prisma.borrower.findUnique({
      where: {id: borrowerId},
      include: {
        applications: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if(!borrower) {
      return res.status(404).json({
        success: false,
        message: "ບໍ່ພົບຂໍ້ມູນຜູ້ກູ້",
      });
    }

    // 2. ກວດສອບເງື່ອນໄຂ LoanApplication
    // ຄົ້ນຫາໃບສະໝັກທີ່ມີສະຖານະ "ບໍ່ແມ່ນ REJECTED"
    const activeApplications=borrower.applications.filter(
      (app) => app.status!=="REJECTED"
    );

    if(activeApplications.length>0) {
      return res.status(400).json({
        success: false,
        message: "ບໍ່ສາມາດລົບໄດ້ ເນື່ອງຈາກຜູ້ກູ້ມີໃບສະໝັກເງິນກູ້ທີ່ຢູ່ໃນຂະບວນການ ຫຼື ຖືກອະນຸຍາດແລ້ວ (ສະຖານະບໍ່ແມ່ນ REJECTED)",
      });
    }

    // 3. ລົບຂໍ້ມູນ (ເນື່ອງຈາກໃນ Schema ຕັ້ງ onDelete: Cascade ໄວ້ຢູ່ບາງຕາຕະລາງ ເຊັ່ນ LoanApplication)
    // ແຕ່ເພື່ອຄວາມປອດໄພ ແລະ ບໍ່ໃຫ້ຕິດ Foreign Key Constraint ຂອງຕາຕະລາງອື່ນໆ ທີ່ບໍ່ມີ Cascade
    // ເຮົາຈະໃຊ້ Prisma Transaction ໃນການລົບຂໍ້ມູນທີ່ກ່ຽວຂ້ອງອອກກ່ອນ
    await prisma.$transaction([
      // ລົບຂໍ້ມູນລາຍໄດ້ ແລະ ໝີ້ສິນສ່ວນຕົວຂອງຜູ້ກູ້ກ່ອນ
      prisma.borrowerIncome.deleteMany({where: {borrowerId}}),
      prisma.businessIncome.deleteMany({where: {borrowerId}}),
      prisma.externalLoan.deleteMany({where: {borrowerId}}),

      // ລົບຕົວຜູ້ກູ້ (ໃບສະໝັກ LoanApplication ຈະຖືກລົບອັດຕະໂນມັດເນື່ອງຈາກ onDelete: Cascade ໃນ Schema)
      prisma.borrower.delete({where: {id: borrowerId}}),
    ]);

    // 4. ບັນທຶກ Audit Log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "DELETE",
        entityType: "Borrower",
        entityId: borrowerId,
        oldValue: borrower,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        description: `ລົບຜູ້ກູ້: ${borrower.laoFirstName} ${borrower.laoLastName} (${borrower.firstName} ${borrower.lastName})`,
      },
    });

    return res.json({
      success: true,
      message: "ລົບຂໍ້ມູນຜູ້ກູ້ສຳເລັດ",
    });

  } catch(err) {
    console.error("DeleteBorrower Error:",err);
    return res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ",
    });
  }
};