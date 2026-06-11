const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * CREATE BorrowerIncome
 */
exports.createBorrowerIncome = async (req, res) => {
  const userId = req.user.id;
  const borrowerId = Number(req.params.borrowerId);

  try {
    const { monthYear, grossIncome, netIncome, source } = req.body;

    if (!monthYear || netIncome == null) {
      return res.status(400).json({
        success: false,
        message: "monthYear ແລະ netIncome ຈຳເປັນຕ້ອງກຳນົດ",
      });
    }
       const incomeCount = await prisma.borrowerIncome.count({
      where: { borrowerId },
    });

    if (incomeCount >= 6) {
      return res.status(400).json({
        success: false,
        message: "ສາມາດເພີ່ມລາຍຮັບໄດ້ສູງສຸດ 6 ລາຍການ",
      });
    }

    /* (Optional) 🔁 กันเดือนซ้ำ */
    const existMonth = await prisma.borrowerIncome.findFirst({
      where: {
        borrowerId,
        monthYear,
      },
    });

    if (existMonth) {
      return res.status(400).json({
        success: false,
        message: `ເດືອນ ${monthYear} ມີຂໍ້ມູນແລ້ວ`,
      });
    }

    const income = await prisma.borrowerIncome.create({
      data: {
        borrowerId,
        monthYear,
        grossIncome: grossIncome || netIncome,
        netIncome,
        source,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "CREATE",
        entityType: "BorrowerIncome",
        entityId: income.id,
        newValue: income,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        description: "Create borrower income",
      },
    });

    res.status(201).json({ success: true, data: income });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "System error" });
  }
};

/**
 * UPDATE BorrowerIncome
 */
exports.updateBorrowerIncome = async (req, res) => {
  const userId = req.user.id;
  const id = Number(req.params.id);

  try {
    const old = await prisma.borrowerIncome.findUnique({ where: { id } });
    if (!old) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    const updated = await prisma.borrowerIncome.update({
      where: { id },
      data: req.body,
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "UPDATE",
        entityType: "BorrowerIncome",
        entityId: id,
        oldValue: old,
        newValue: updated,
        description: "Update borrower income",
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: "System error" });
  }
};

/**
 * GET Borrower Incomes
 */
exports.getBorrowerIncomes = async (req, res) => {
  const borrowerId = Number(req.params.borrowerId);

  try {
    const incomes = await prisma.borrowerIncome.findMany({
      where: { borrowerId },
      orderBy: { monthYear: "desc" },
    });

    res.json({ success: true, data: incomes });
  } catch (err) {
    res.status(500).json({ success: false, message: "System error" });
  }
};

/**
 * DELETE BorrowerIncome (Hard delete OK)
 */
exports.deleteBorrowerIncome = async (req, res) => {
  const userId = req.user.id;
  const id = Number(req.params.id);

  try {
    const old = await prisma.borrowerIncome.findUnique({ where: { id } });
    if (!old) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    await prisma.borrowerIncome.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "DELETE",
        entityType: "BorrowerIncome",
        entityId: id,
        oldValue: old,
        description: "Delete borrower income",
      },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "System error" });
  }
};
