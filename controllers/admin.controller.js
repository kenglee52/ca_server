const adminService = require("../services/admin.service");

const registerAdmin = async (req, res) => {
  try {
    const user = await adminService.registerAdmin(req.body);

    res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      data: user
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  registerAdmin
};