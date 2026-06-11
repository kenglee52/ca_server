const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// helper: parse decimal safely
const toNumber = (v, def = null) => {
  if (v === undefined || v === null || v === "") return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const allowSource = new Set(["FINA_INTERNAL", "EXTERNAL_BANK", "CIB"]);

async function writeAuditLog({ req, userId, action, entityId, oldValue, newValue, description }) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType: "ExternalLoan",
      entityId,
      oldValue: oldValue ?? undefined,
      newValue: newValue ?? undefined,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      description,
    },
  });
}

/**
 * CREATE ExternalLoan
 * CREDIT_OFFICER / ADMIN
 */
exports.createExternalLoan = async (req, res) => {
  const userId = req.user?.id;

  try {
    const {
      borrowerId,
      source,
      product,
      institution,
      loanAmount,
      outstanding,
      interestRatePa,
      termMonths,
      startDate,
      endDate,
      monthlyInstallment,
      overdueDays,
      creditClass,
      checkDate,
      status,
    } = req.body;

    // required
    if (!borrowerId || !product || loanAmount == null || outstanding == null) {
      return res.status(400).json({
        success: false,
        message: "borrowerId, product, loanAmount, outstanding ຈຳເປັນຕ້ອງກຳນົດ",
      });
    }

    // validate borrower exists
    const borrower = await prisma.borrower.findUnique({ where: { id: Number(borrowerId) } });
    if (!borrower) {
      return res.status(404).json({ success: false, message: "ບໍ່ພົບ Borrower" });
    }

    // validate source (ถ้ายังใช้ String)
    if (source && !allowSource.has(source)) {
      return res.status(400).json({
        success: false,
        message: "source ຕ້ອງເປັນ FINA_INTERNAL / EXTERNAL_BANK / CIB",
      });
    }

    const newLoan = await prisma.externalLoan.create({
      data: {
        borrowerId: Number(borrowerId),
        source: source || "EXTERNAL_BANK",
        product,
        institution: institution || null,
        loanAmount: toNumber(loanAmount, 0),
        outstanding: toNumber(outstanding, 0),
        interestRatePa: toNumber(interestRatePa, null),
        termMonths: termMonths != null ? Number(termMonths) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        monthlyInstallment: toNumber(monthlyInstallment, null),
        overdueDays: overdueDays != null ? Number(overdueDays) : 0,
        creditClass: creditClass || null,
        checkDate: checkDate ? new Date(checkDate) : undefined, // ถ้าไม่ส่ง ใช้ default(now())
        status: status || null,
      },
    });

    await writeAuditLog({
      req,
      userId,
      action: "CREATE",
      entityId: newLoan.id,
      oldValue: null,
      newValue: newLoan,
      description: `Created ExternalLoan for borrowerId=${borrowerId}`,
    });

    return res.status(201).json({ success: true, data: newLoan });
  } catch (err) {
    console.error("CreateExternalLoan Error:", err);
    return res.status(500).json({ success: false, message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ" });
  }
};

/**
 * UPDATE ExternalLoan
 * CREDIT_OFFICER / ADMIN
 */
exports.updateExternalLoan = async (req, res) => {
  const userId = req.user?.id;
  const id = Number(req.params.id);

  try {
    const oldLoan = await prisma.externalLoan.findUnique({ where: { id } });
    if (!oldLoan) return res.status(404).json({ success: false, message: "ບໍ່ພົບ ExternalLoan" });

    // ถ้าลบแล้วไม่ให้แก้ (กันข้อมูลเพี้ยน)
    if (oldLoan.isDeleted) {
      return res.status(400).json({ success: false, message: "ລາຍການນີ້ຖືກລົບແລ້ວ (isDeleted=true)" });
    }

    // ถ้าใช้ source เป็น String: validate
    if (req.body.source && !allowSource.has(req.body.source)) {
      return res.status(400).json({
        success: false,
        message: "source ຕ້ອງເປັນ FINA_INTERNAL / EXTERNAL_BANK / CIB",
      });
    }

    const updated = await prisma.externalLoan.update({
      where: { id },
      data: {
        ...req.body,
        borrowerId: req.body.borrowerId != null ? Number(req.body.borrowerId) : undefined,
        loanAmount: req.body.loanAmount != null ? toNumber(req.body.loanAmount, 0) : undefined,
        outstanding: req.body.outstanding != null ? toNumber(req.body.outstanding, 0) : undefined,
        interestRatePa: req.body.interestRatePa != null ? toNumber(req.body.interestRatePa, null) : undefined,
        termMonths: req.body.termMonths != null ? Number(req.body.termMonths) : undefined,
        monthlyInstallment: req.body.monthlyInstallment != null ? toNumber(req.body.monthlyInstallment, null) : undefined,
        overdueDays: req.body.overdueDays != null ? Number(req.body.overdueDays) : undefined,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
        checkDate: req.body.checkDate ? new Date(req.body.checkDate) : undefined,
      },
    });

    await writeAuditLog({
      req,
      userId,
      action: "UPDATE",
      entityId: id,
      oldValue: oldLoan,
      newValue: updated,
      description: `Updated ExternalLoan id=${id}`,
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("UpdateExternalLoan Error:", err);
    return res.status(500).json({ success: false, message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ" });
  }
};

/**
 * GET ExternalLoan by ID
 * ADMIN เห็นได้หมด รวม isDeleted=true
 * Non-admin เห็นเฉพาะ isDeleted=false
 */
exports.getExternalLoanById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const role = req.user?.role;

    const where = role === "ADMIN" ? { id } : { id, isDeleted: false };

    const loan = await prisma.externalLoan.findFirst({
      where,
      include: { borrower: true },
    });

    if (!loan) return res.status(404).json({ success: false, message: "ບໍ່ພົບ ExternalLoan" });

    return res.json({ success: true, data: loan });
  } catch (err) {
    console.error("GetExternalLoanById Error:", err);
    return res.status(500).json({ success: false, message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ" });
  }
};

/**
 * GET ExternalLoans by Borrower
 * /borrowers/:borrowerId/external-loans?source=CIB&includeDeleted=true
 */
exports.getExternalLoansByBorrower = async (req, res) => {
  try {
    const borrowerId = Number(req.params.borrowerId);
    const { source, includeDeleted } = req.query;
    const role = req.user?.role;

    // Non-admin: ไม่ให้ includeDeleted=true
    const canSeeDeleted = role === "ADMIN" && includeDeleted === "true";

    const where = {
      borrowerId,
      ...(source ? { source: String(source) } : {}),
      ...(canSeeDeleted ? {} : { isDeleted: false }),
    };

    const loans = await prisma.externalLoan.findMany({
      where,
      orderBy: [{ checkDate: "desc" }, { createdAt: "desc" }],
    });

    return res.json({ success: true, data: loans });
  } catch (err) {
    console.error("GetExternalLoansByBorrower Error:", err);
    return res.status(500).json({ success: false, message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ" });
  }
};

/**
 * DELETE ExternalLoan (Soft delete)
 * CREDIT_OFFICER / ADMIN
 */
exports.deleteExternalLoan = async (req, res) => {
  const userId = req.user?.id;
  const id = Number(req.params.id);

  try {
    const oldLoan = await prisma.externalLoan.findUnique({ where: { id } });
    if (!oldLoan) return res.status(404).json({ success: false, message: "ไม่พบ ExternalLoan" });

    if (oldLoan.isDeleted) {
      return res.status(400).json({ success: false, message: "ລາຍການນີ້ຖືກລົບແລ້ວ" });
    }

    const deleted = await prisma.externalLoan.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    await writeAuditLog({
      req,
      userId,
      action: "DELETE",
      entityId: id,
      oldValue: oldLoan,
      newValue: deleted,
      description: `Soft deleted ExternalLoan id=${id}`,
    });

    return res.json({ success: true, message: "Deleted external loan successfully", data: deleted });
  } catch (err) {
    console.error("DeleteExternalLoan Error:", err);
    return res.status(500).json({ success: false, message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ" });
  }
};
