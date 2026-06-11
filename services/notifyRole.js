const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { sendMail } = require("../utils/mailer");

async function notifyRole({ applicationId, role, subject, headline, linkPath }) {
  const appId = Number(applicationId);

  const app = await prisma.loanApplication.findUnique({
    where: { id: appId },
    select: {
      id: true,
      loanPurpose: true,
      loanAmountRequested: true,
      status: true,
      borrower: { select: { laoFirstName: true, laoLastName: true, phone: true } },
      user: { select: { id: true, email: true, fullName: true } }, // CREDIT_OFFICER owner (ถ้ามี)
    },
  });
  if (!app) return;

  // หา user ตาม role
  const users = await prisma.user.findMany({
    where: { role, email: { not: null } },
    select: { email: true, fullName: true },
  });

  const emails = users.map(u => u.email).filter(Boolean);
  if (!emails.length) return;

  const borrowerName =
    `${app.borrower?.laoFirstName || ""} ${app.borrower?.laoLastName || ""}`.trim() || "-";
  const amount = Number(app.loanAmountRequested || 0).toLocaleString("lo-LA");
  const link = `${process.env.APP_BASE_URL || ""}${linkPath}${app.id}`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h3># NEW LOAN APPLICATION PENDING APPROVAL</h3>

      <h3>${headline}</h3>
      <p><b>Application ID:</b> #${app.id}</p>
      <p><b>Status:</b> ${app.status}</p>
      <p><b>Borrower:</b> ${borrowerName}</p>
      <p><b>Phone:</b> ${app.borrower?.phone || "-"}</p>
      <p><b>Purpose:</b> ${app.loanPurpose || "-"}</p>
      <p><b>Amount:</b> ${amount}</p>
      <p><a href="${link}">Open in portal</a></p>
      <hr />
      <p style="color:#666;">Automated notification from FINA System.</p>
    </div>
  `;

  // ใช้ BCC กันเห็น email กันเอง
  await sendMail({ bcc: emails, subject, html });
}

module.exports = { notifyRole };
