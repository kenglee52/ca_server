const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const { sendMail } = require("../utils/mailer");

async function notifyCreditOfficerOnCeoDecision({ applicationId, decision }) {
  const appId = Number(applicationId);

  const app = await prisma.loanApplication.findUnique({
    where: { id: appId },
    select: {
      id: true,
      status: true,
      user: { select: { email: true, fullName: true } }, // CO เจ้าของคำขอ
    },
  });

  const to = app?.user?.email;
  if (!to) return;

  const link = `${process.env.APP_BASE_URL || ""}/credit/applications/${app.id}`;
  const subject = `CEO decision on application (#${app.id}): ${decision}`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h3>CEO Decision: ${decision}</h3>
      <p><b>Application ID:</b> #${app.id}</p>
      <p><b>Current Status:</b> ${app.status}</p>
      <p><a href="${link}">Open in portal</a></p>
      <hr />
      <p style="color:#666;">Automated notification from FINA System.</p>
    </div>
  `;

  await sendMail({ to, subject, html });
}

module.exports = { notifyCreditOfficerOnCeoDecision };
