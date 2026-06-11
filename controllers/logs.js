const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.getAllLogs = async (req, res) => {
  try {

  const logs = await prisma.auditLog.findMany({
      orderBy: { performedAt: "desc" },
      include: {
        user: {
          select: {
           
            username: true,
            role: true,
          },
        },
      },
    }); 
    return res.json({ success: true, data: logs });
  } catch (err) {
    console.error("GetAllLogs Error:", err);
    return res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ",
    });
  }
};