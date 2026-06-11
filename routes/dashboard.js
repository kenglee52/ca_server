const express = require("express");
const router = express.Router();

const {
loanTypesSummary,monthlyApplications,approvalStatusSummary,approvalStatusMonthly,approvedLoanTypesSummary
} = require("../controllers/dashboard");

const { authCheck, reportViewCheck } = require("../middlewares/authCheck");
router.get('/dashboard/loan-types-summary', authCheck, reportViewCheck, loanTypesSummary);
router.get('/dashboard/approval-status-summary', authCheck, reportViewCheck, approvalStatusSummary);
router.get('/dashboard/approval-status-monthly', authCheck, reportViewCheck, approvalStatusMonthly);
router.get('/dashboard/monthly-applications', authCheck, reportViewCheck, monthlyApplications);
router.get(
  "/dashboard/approved-loan-types-summary",
  authCheck,
  reportViewCheck,
  approvedLoanTypesSummary
);


module.exports = router;