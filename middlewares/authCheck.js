// middlewares/authCheck.js
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();


exports.authCheck = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'ບໍ່ພົບ Token ຫຼື ບໍ່ໄດ້ສົ່ງ Token ມາ',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'ຜູ້ໃຊ້ບໍ່ພົບ ຫຼື ຖືກລຶບແລ້ວ',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth Check Error:', err.name, err.message);

    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Token ບໍ່ຖືກຕ້ອງ' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token ໝົດອາຍຸແລ້ວ ກະລຸນາເຂົ້າສູ່ລະບົບໃໝ່' });
    }

    return res.status(500).json({
      success: false,
      message: 'ເກີດຂໍ້ຜິດພາດໃນການກວດສອບ Token',
    });
  }
};
exports. borrowerViewCheck = (req, res, next) => {
  const allowedRoles = [
    "CREDIT_OFFICER",
    "VERIFIER",
    "DCO_APPROVER",
    "CEO_APPROVER",
    "ADMIN",
  ];

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "No permission to view borrower",
    });
  }

  next();
};
exports.reportViewCheck = (req, res, next) => {
  const allowedRoles = [
    "CREDIT_OFFICER",
    "VERIFIER",
    "DCO_APPROVER",
    "CEO_APPROVER",
    "ADMIN",
  ];

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "No permission to view borrower",
    });
  }

  next();
};

exports.adminCheck = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'ຕ້ອງເຂົ້າສູ່ລະບົບກ່ອນ' });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'ທ່ານບໍ່ມີສິດ (ADMIN ເທົ່ານັ້ນ)',
    });
  }

  next();
};


exports.dcoCheck = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'ຕ້ອງເຂົ້າສູ່ລະບົບກ່ອນ',
    });
  }

  if (req.user.role !== 'DCO_APPROVER') {
    return res.status(403).json({
      success: false,
      message: 'ສິດເຂົ້າເຖິງຖືກປະຕິເສດ: ສະຫງວນສຳລັບ DCO_APPROVER ເທົ່ານັ້ນ',
    });
  }

  next();
};

// 4) CREDIT_OFFICERCheck
exports.creditOfficerCheck = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'ຕ້ອງເຂົ້າສູ່ລະບົບກ່ອນ',
    });
  }

  if (req.user.role !== 'CREDIT_OFFICER') {
    return res.status(403).json({
      success: false,
      message: 'ສິດເຂົ້າເຖິງຖືກປະຕິເສດ: ສະຫງວນສຳລັບ CREDIT_OFFICER ເທົ່ານັ້ນ',
    });
  }

  next();
};

// 5) CEO_APPROVERCheck
exports.ceoCheck = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'ຕ້ອງເຂົ້າສູ່ລະບົບກ່ອນ',
    });
  }

  if (req.user.role !== 'CEO_APPROVER') {
    return res.status(403).json({
      success: false,
      message: 'ສິດເຂົ້າເຖິງຖືກປະຕິເສດ: ສະຫງວນສຳລັບ CEO_APPROVER ເທົ່ານັ້ນ',
    });
  }

  next();
};

// 6) VERIFIERCheck
exports.verifierCheck = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'ຕ້ອງເຂົ້າສູ່ລະບົບກ່ອນ',
    });
  }

  if (req.user.role !== 'VERIFIER') {
    return res.status(403).json({
      success: false,
      message: 'ສິດເຂົ້າເຖິງຖືກປະຕິເສດ: ສະຫງວນສຳລັບ VERIFIER ເທົ່ານັ້ນ',
    });
  }

  next();
};

exports.verifyToken = async (req, res) => {
  try {
   
    return res.status(200).json({
      success: true,
      message: 'Token ຖືກຕ້ອງ',
      user: req.user,
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Token ບໍ່ຖືກຕ້ອງ',
    });
  }
};
