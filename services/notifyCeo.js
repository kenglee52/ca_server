const { notifyRole } = require("./notifyRole");

async function notifyCeoOnDcoApprove({ applicationId }) {
  return notifyRole({
    applicationId,
    role: "CEO_APPROVER",
    subject: `Pending CEO review (#${applicationId})`,
    headline: "Loan Application Approved by DCO → Pending CEO Review",
    linkPath: "/ceo/applications/",
  });
}

module.exports = { notifyCeoOnDcoApprove };
