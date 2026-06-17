// controllers/authen.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const {
  checkLoginLock,
  recordFailedLogin,
  clearLoginAttempts,
} = require("../helpers/loginLimter");
const prisma = new PrismaClient();

/**
 * POST /api/auth/login
 * body: { username, password }
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "ກະລຸນາປ້ອນ username ແລະ password",
      });
    }

    // ==========================
    // Check Lock
    // ==========================
    const lockInfo = checkLoginLock(username);

    if (lockInfo?.locked) {
      return res.status(429).json({
        success: false,
        message: `ບັນຊີນີ້ຖືກລັອກ ກະລຸນາລໍຖ້າ ${lockInfo.remainingSeconds} ວິນາທີ`,
      });
    }

    // ==========================
    // Find User
    // ==========================
    const user = await prisma.user.findUnique({
      where: {
        username,
      },
    });

    if (!user) {
      recordFailedLogin(username);

      return res.status(400).json({
        success: false,
        message: "username ຫຼື password ບໍ່ຖືກຕ້ອງ",
      });
    }

    // ==========================
    // Check Password
    // ==========================
    const isMatch = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!isMatch) {
      recordFailedLogin(username);

      return res.status(400).json({
        success: false,
        message: "username ຫຼື password ບໍ່ຖືກຕ້ອງ",
      });
    }

    // ==========================
    // Login Success
    // ==========================
    clearLoginAttempts(username);

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      process.env.SECRET,
      {
        expiresIn: "8h",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login ສຳເລັດ",
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ",
    });
  }
};

/**
 * POST /api/auth/current-user
 * header: Authorization: Bearer <token>
 */
exports.currentUser = async (req, res) => {
  try {
    // req.user มาจาก middleware authCheck
    return res.status(200).json({
      success: true,
      message: 'ດຶງຂໍ້ມູນຜູ້ໃຊ້ສຳເລັດ',
      user: req.user,
    });
  } catch (err) {
    console.error('Current User Error:', err);
    return res.status(500).json({
      success: false,
      message: 'ເກີດຂໍ້ຜິດພາດໃນລະບົບ',
    });
  }
};

