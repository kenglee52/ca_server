const express = require("express");
const router = express.Router();

const {
  createLoanApplication,
  getLoanApplicationById,
  getLoanApplications,
  updateLoanApplication,
  getLoanApplicationsByStatus, approveByVerifier,rejectByVerifier, returnByVerifier,resubmitToVerifier,rejectByDco,approveByDco,
  getLoanReport,getMyActivityHistory,approveByCeo,rejectByCeo,getFullLoanReport,exportLoanReportExcel
} = require("../controllers/loanApplication");

const { authCheck, creditOfficerCheck, borrowerViewCheck, verifierCheck, reportViewCheck ,dcoCheck,ceoCheck} = require("../middlewares/authCheck");
router.get('/loan-applications/:id/export-excel', authCheck, reportViewCheck, exportLoanReportExcel);
// CEO only
router.post(
  "/loan-applications/:id/approve-by-ceo",
  authCheck,
  ceoCheck,         
  approveByCeo
);

router.post(
  "/loan-applications/:id/reject-by-ceo",
  authCheck,
  ceoCheck,
  rejectByCeo
);

// DCO only
router.post(
  "/loan-applications/:id/approve-by-dco",
  authCheck,
  dcoCheck,          
  approveByDco
);

router.post(
  "/loan-applications/:id/reject-by-dco",
  authCheck,
  dcoCheck,
  rejectByDco
);

router.post("/loan-applications/:id/approve-by-verifier",
  authCheck,
  verifierCheck,
  approveByVerifier
);
// verifier only
router.post(
  "/loan-applications/:id/reject-by-verifier",
  authCheck,
  verifierCheck,
  rejectByVerifier,
);
router.post(
  "/loan-applications/:id/return-by-verifier",
  authCheck,
  verifierCheck,
  returnByVerifier
);

router.get('/loan-applications/:id/full-report', authCheck, reportViewCheck, getFullLoanReport);

router.get("/loan-applications/by-status", authCheck, borrowerViewCheck, getLoanApplicationsByStatus);
// router.put("/loan-applications/:id/returned", authCheck, creditOfficerCheck, returnedAndUpdate);
router.post("/loan-applications/:id/resubmit-to-verifier", authCheck, creditOfficerCheck, resubmitToVerifier);

router.get("/loan-applications/report", authCheck, reportViewCheck, getLoanReport);
router.get("/loan-applications/my-history", authCheck, reportViewCheck, getMyActivityHistory);

// Credit Officer create/update
router.post("/loan-applications", authCheck, creditOfficerCheck, createLoanApplication);
router.put("/loan-applications/:id", authCheck, creditOfficerCheck, updateLoanApplication);

router.get("/loan-applications/:id", authCheck, borrowerViewCheck, getLoanApplicationById);
router.get("/loan-applications", authCheck, borrowerViewCheck, getLoanApplications);


module.exports = router;
