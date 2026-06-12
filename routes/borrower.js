const express = require("express");
const router = express.Router();

const {
  createBorrower,
  updateBorrower,
  getBorrowerById,
  getBorrowers,
  deleteBorrower
} = require("../controllers/borrowers");

const { authCheck,creditOfficerCheck ,borrowerViewCheck} = require("../middlewares/authCheck");

router.post("/borrowers", authCheck,creditOfficerCheck, createBorrower);
router.put("/borrowers/:id", authCheck,creditOfficerCheck, updateBorrower);
router.get("/borrowers/:id", authCheck, borrowerViewCheck, getBorrowerById);
router.get("/borrowers", authCheck, borrowerViewCheck, getBorrowers);
router.delete("/borrower/:id", authCheck, creditOfficerCheck, deleteBorrower);

module.exports = router;
