const { PrismaClient, LoanStatus } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * ==========================================
 * 1) Card Dashboard Stats
 * - ຈຳນວນ User ທັງໝົດ
 * - ຈຳນວນ Borrower ທັງໝົດ
 * - ຈຳນວນຄຳຂໍກູ້ຕາມສະຖານະ: PENDING_VERIFIER, PENDING_DCO, PENDING_CEO, RETURNED, REJECTED
 * ==========================================
 */
async function getDashboardCardStats() {
  const [
    totalUsers,
    totalBorrowers,
    pendingVerifier,
    pendingDco,
    pendingCeo,
    returned,
    rejected,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.borrower.count(),
    prisma.loanApplication.count({
      where: { status: LoanStatus.PENDING_VERIFIER },
    }),
    prisma.loanApplication.count({
      where: { status: LoanStatus.PENDING_DCO },
    }),
    prisma.loanApplication.count({
      where: { status: LoanStatus.PENDING_CEO },
    }),
    prisma.loanApplication.count({
      where: { status: LoanStatus.RETURNED },
    }),
    prisma.loanApplication.count({
      where: { status: LoanStatus.REJECTED },
    }),
  ]);

  return {
    totalUsers,
    totalBorrowers,
    pendingVerifier,
    pendingDco,
    pendingCeo,
    returned,
    rejected,
  };
}

/**
 * ==========================================
 * 2) Audit Log ຂອງມື້ນີ້ (ສະເພາະ Today)
 * ຄໍລຳຕາຕະລາງ: ເລກທີ | ການກະທຳ | ປະເພດຂໍ້ມູນ | ເລກທີ່ຂໍ້ມູນ | ຜູ້ກະທຳ
 * ==========================================
 */
async function getTodayAuditLogs() {
  const now = new Date();
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0, 0, 0, 0,
  );
  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23, 59, 59, 999,
  );

  const logs = await prisma.auditLog.findMany({
    where: {
      performedAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    orderBy: { performedAt: 'desc' },
    include: {
      user: {
        select: { fullName: true, username: true },
      },
    },
  });

  return logs.map((log) => ({
    id: log.id,                 // ເລກທີ
    action: log.action,         // ການກະທຳ
    entityType: log.entityType, // ປະເພດຂໍ້ມູນ
    entityId: log.entityId,     // ເລກທີ່ຂໍ້ມູນ
    performedBy: (log.user && (log.user.fullName || log.user.username)) || 'System', // ຜູ້ກະທຳ
    performedAt: log.performedAt,
  }));
}

/**
 * ==========================================
 * 3) ຟັງຊັນລວມ ໃຊ້ດຶງຂໍ້ມູນທັງໝົດພ້ອມກັນສຳລັບ Admin Dashboard
 * ==========================================
 */
async function getAdminDashboardData() {
  const [cardStats, todayAuditLogs] = await Promise.all([
    getDashboardCardStats(),
    getTodayAuditLogs(),
  ]);

  return { cardStats, todayAuditLogs };
}

module.exports = {
  getDashboardCardStats,
  getTodayAuditLogs,
  getAdminDashboardData,
};