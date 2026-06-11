const express = require("express");
const router = express.Router();

const {
  createExternalLoan,
  updateExternalLoan,
  getExternalLoanById,
  getExternalLoansByBorrower,
  deleteExternalLoan,
} = require("../controllers/external-loans");

const { authCheck, creditOfficerCheck } = require("../middlewares/authCheck");


router.post("/external-loans", authCheck, creditOfficerCheck, createExternalLoan);
router.put("/external-loans/:id", authCheck, creditOfficerCheck, updateExternalLoan);
router.delete("/external-loans/:id", authCheck, creditOfficerCheck, deleteExternalLoan);


router.get("/external-loans/:id", authCheck, getExternalLoanById);
router.get("/borrowers/:borrowerId/external-loans", authCheck, getExternalLoansByBorrower);

module.exports = router;
