const express = require("express");
const router = express.Router();

const {
  createBusinessIncome,
  updateBusinessIncome,
  getBusinessIncomes,
  deleteBusinessIncome,exportBusinessIncomePdf
} = require("../controllers/businessIncome");

const { authCheck, creditOfficerCheck } = require("../middlewares/authCheck");


// Funtion ນີ້ພັດທະນາບໍ່ແລ້ວ  "/borrowers/:borrowerId/business-incomes/export-pdf",
router.post(
  "/borrowers/:borrowerId/business-incomes/export-pdf",
  authCheck,
  creditOfficerCheck,
  exportBusinessIncomePdf
);

router.post(
  "/borrowers/:borrowerId/business-incomes",
  authCheck,
  creditOfficerCheck,
  createBusinessIncome
);

router.put(
  "/business-incomes/:id",
  authCheck,
  creditOfficerCheck,
  updateBusinessIncome
);

router.get(
  "/borrowers/:borrowerId/business-incomes",
  authCheck,
  getBusinessIncomes
);

router.delete(
  "/business-incomes/:id",
  authCheck,
  creditOfficerCheck,
  deleteBusinessIncome
);router.post(
  "/borrowers/:borrowerId/business-incomes/export-pdf",
  authCheck,
  creditOfficerCheck,
  exportBusinessIncomePdf
);

module.exports = router;
