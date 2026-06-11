const express = require("express");
const router = express.Router();

const {
  createBorrowerIncome,
  updateBorrowerIncome,
  getBorrowerIncomes,
  deleteBorrowerIncome,
} = require("../controllers/borrowerIncome");

const { authCheck, creditOfficerCheck } = require("../middlewares/authCheck");

router.post(
  "/borrowers/:borrowerId/incomes",
  authCheck,
  creditOfficerCheck,
  createBorrowerIncome
);

router.put(
  "/borrower-incomes/:id",
  authCheck,
  creditOfficerCheck,
  updateBorrowerIncome
);

router.get(
  "/borrowers/:borrowerId/incomes",
  authCheck,
  getBorrowerIncomes
);

router.delete(
  "/borrower-incomes/:id",
  authCheck,
  creditOfficerCheck,
  deleteBorrowerIncome
);

module.exports = router;
