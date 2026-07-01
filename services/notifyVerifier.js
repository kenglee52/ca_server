const { notifyRole } = require("./notifyRole");

async function notifyVerifierOnSubmit({ applicationId }) {
  return notifyRole({
    applicationId,
    role: "VERIFIER",
    subject: `New application pending verification (#${applicationId})`,
    headline: "New Loan Application for Verification",
    linkPath: `/verifier/inbox/${applicationId}`,
  });
}

module.exports = { notifyVerifierOnSubmit };
