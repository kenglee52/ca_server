const express = require("express");
const router = express.Router();

const adminController = require("../controllers/admin.controller");

// router.post("/register", adminController.registerAdmin);
// Also allow mounting at '/api/admin-register' so POST /api/admin-register works
router.post("/", adminController.registerAdmin);

module.exports = router;