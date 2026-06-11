// controllers/manage_user.js
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const fs = require("fs");
const path = require("path");
exports.createUser = async (req, res) => {
  try {
    const { username, password, role, email, fullName } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "username, password, role ຈຳເປັນຕ້ອງມີ",
      });
    }

    const usernameExists = await prisma.user.findUnique({ where: { username } });
    if (usernameExists) {
      return res.status(409).json({
        success: false,
        message: "username ນີ້ມີແລ້ວ",
      });
    }

    let emailExists = null;
    if (email) {
      emailExists = await prisma.user.findUnique({ where: { email } });
      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: "email ນີ້ມີແລ້ວ",
        });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let signatureUrl = null;
    if (req.file) {
      signatureUrl = `/upload/signatures/${req.file.filename}`;
    }

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role,
        email: email || null,
        fullName: fullName ? fullName.trim() : null,  
        signatureUrl,
      },
      select: {
        id: true,
        username: true,
        fullName: true,       
        email: true,
        role: true,
        signatureUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Create user ສຳເລັດ",
      user,
    });
  } catch (err) {
    console.error("CreateUser Error:", err);
    return res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ",
    });
  }
};
exports.getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { id: "desc" },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        email: true,
        signatureUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (err) {
    console.error("GetAllUsers Error:", err);
    return res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ",
    });
  }
};

/**
 * GET /api/manage_user/:id
 */
exports.getUserById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, message: "id ບໍ່ຖືກຕ້ອງ" });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        email: true,
        signatureUrl: true,
        createdAt: true,
      
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "ບໍ່ພົບ user" });
    }

    return res.status(200).json({ success: true, user });
  } catch (err) {
    console.error("GetUserById Error:", err);
    return res.status(500).json({ success: false, message: "System error" });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, message: "id ບໍ່ຖືກຕ້ອງ" });
    }

    const { username, password, role, email, fullName } = req.body;


    if (!username && !password && !role && !email && !fullName && !req.file) {
      return res.status(400).json({
        success: false,
        message: "ຕ້ອງມີ username ຫຼື password ຫຼື role ຫຼື email ຫຼື fullName ຫຼື signature ຢ່າງໃດຢ່າງໜຶ່ງ",
      });
    }

    const exists = await prisma.user.findUnique({ where: { id } });
    if (!exists) {
      return res.status(404).json({ success: false, message: "ບໍ່ພົບ user" });
    }

    const data = {};

    // username
    if (username && username !== exists.username) {
      const dup = await prisma.user.findUnique({ where: { username } });
      if (dup) {
        return res.status(409).json({ success: false, message: "username ຊ້ຳ" });
      }
      data.username = username;
    }

    // password
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    // role
    if (role) {
      data.role = role;
    }

    // email
    if (email && email !== exists.email) {
      const dupEmail = await prisma.user.findUnique({ where: { email } });
      if (dupEmail) {
        return res.status(409).json({ success: false, message: "email ຊ້ຳ" });
      }
      data.email = email;
    }

    // fullName (เพิ่มตรงนี้)
    if (fullName && fullName !== exists.fullName) {
      data.fullName = fullName.trim();
    }

    // จัดการ signatureUrl (เหมือนเดิม)
    if (req.file) {
      if (exists.signatureUrl) {
        const relativePath = exists.signatureUrl.startsWith('/') 
          ? exists.signatureUrl.slice(1) 
          : exists.signatureUrl;

        const oldFilePath = path.join(process.cwd(), relativePath);

        console.log(`[DEBUG] Trying to delete old signature at: ${oldFilePath}`);

        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log(`[SUCCESS] Deleted old signature: ${exists.signatureUrl}`);
        } else {
          console.log(`[WARN] Old signature file not found: ${oldFilePath}`);
        }
      }

      const signatureUrl = `/upload/signatures/${req.file.filename}`;
      data.signatureUrl = signatureUrl;
    }

    // อัปเดต
    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        fullName: true,           // ← เพิ่มตรงนี้
        role: true,
        email: true,
        signatureUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Update user ສຳເລັດ",
      user,
    });
  } catch (err) {
    console.error("UpdateUser Error:", err);
    if (err.code === "ENOENT") {
      console.warn("Old signature file not found, skipping delete");
    }
    return res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ",
    });
  }
};

/**
 * DELETE /api/manage_user/:id
 */
exports.deleteUser = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, message: "id ບໍ່ຖືກຕ້ອງ" });
    }

    // กันลบตัวเอง (optional)
    if (req.user?.id === id) {
      return res.status(400).json({
        success: false,
        message: "ບໍ່ສາມາດລົບບັນຊີຕົວເອງໄດ້",
      });
    }

    // ดึงข้อมูลผู้ใช้ก่อนลบ (เพื่อเอา signatureUrl มาลบไฟล์)
    const user = await prisma.user.findUnique({
      where: { id },
      select: { signatureUrl: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "ບໍ່ພົບ user" });
    }

    // ลบไฟล์ลายเซ็นจริงถ้ามี
    if (user.signatureUrl) {
      const relativePath = user.signatureUrl.startsWith('/') 
        ? user.signatureUrl.slice(1) 
        : user.signatureUrl;

      const filePath = path.join(process.cwd(), relativePath);

      console.log(`[DELETE USER] Trying to delete signature: ${filePath}`);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[DELETE USER] Deleted signature: ${user.signatureUrl}`);
      } else {
        console.log(`[DELETE USER] Signature file not found: ${filePath}`);
      }
    }

    // ลบผู้ใช้จากฐานข้อมูล
    await prisma.user.delete({ where: { id } });

    return res.status(200).json({
      success: true,
      message: "Delete user ສຳເລັດ",
    });
  } catch (err) {
    console.error("DeleteUser Error:", err);

    // จัดการ error ถ้า FK constraint (เช่น มี loanApplication เชื่อมอยู่)
    if (err.code === "P2003") { // Prisma foreign key constraint failed
      return res.status(409).json({
        success: false,
        message: "ບໍ່ສາມາດລົບໄດ້ (ມີຂໍ້ມູນອື່ນເຊື່ອມຕໍ່ກັບຜູ້ໃຊ້ນີ້)",
      });
    }

    return res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ",
    });
  }
};