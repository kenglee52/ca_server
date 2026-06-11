const { notifyRole } = require("./notifyRole");

async function notifyDcoOnVerifierApprove({ applicationId }) {
  return notifyRole({
    applicationId,
    role: "DCO_APPROVER",
    subject: `Pending DCO review (#${applicationId})`,
    headline: "Loan Application Approved by Verifier → Pending DCO Review",
    linkPath: "/dco/applications/",
  });
}

module.exports = { notifyDcoOnVerifierApprove };
