const express = require("express");
const router = express.Router();

const {
  getAllLogs,

} = require("../controllers/logs");

const { authCheck, adminCheck } = require("../middlewares/authCheck");


router.get("/logs", authCheck, adminCheck, getAllLogs);

module.exports = router;
