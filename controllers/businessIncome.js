const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const puppeteer = require("puppeteer");
exports.createBusinessIncome = async (req, res) => {
  const userId = req.user.id;
  const borrowerId = Number(req.params.borrowerId);

  try {
    // 1) validate borrowerId
    if (!borrowerId || Number.isNaN(borrowerId)) {
      return res.status(400).json({
        success: false,
        message: "borrowerId ບໍ່ຖືກຕ້ອງ",
      });
    }

    // 2) โหลด borrower เพื่อตรวจ business fields ก่อน
    const borrower = await prisma.borrower.findUnique({
      where: { id: borrowerId },
      select: {
        id: true,
       
        businessRegistrationNumber: true,
      },
    });

    if (!borrower) {
      return res.status(404).json({
        success: false,
        message: "ບໍ່ພົບ borrower",
      });
    }

    const hasBusinessInfo =
      !!borrower.businessName?.trim?.() ||
      !!borrower.businessRegistrationNumber?.trim?.();

    if (!hasBusinessInfo) {
      return res.status(400).json({
        success: false,
        message:
          "ກະລຸນາກອກ businessName ຫຼື businessRegistrationNumber ກ່ອນເພີ່ມ BusinessIncome",
      });
    }

    // 3) create business income
    const data = req.body;

    const income = await prisma.businessIncome.create({
      data: {
        borrowerId,
        monthYear: data.monthYear,
        saleRevenue: data.saleRevenue,
        costOfSale: data.costOfSale,
        grossProfit: data.grossProfit,
        operExpense: data.operExpense,
        netProfit: data.netProfit,
        source: data.source,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "CREATE",
        entityType: "BusinessIncome",
        entityId: income.id,
        newValue: income,
        description: "Create business income",
      },
    });

    return res.status(201).json({ success: true, data: income });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "System error" });
  }
};

exports.updateBusinessIncome = async (req, res) => {
  const userId = req.user.id;
  const id = Number(req.params.id);

  const old = await prisma.businessIncome.findUnique({ where: { id } });
  if (!old) return res.status(404).json({ success: false });

  const updated = await prisma.businessIncome.update({
    where: { id },
    data: req.body,
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "UPDATE",
      entityType: "BusinessIncome",
      entityId: id,
      oldValue: old,
      newValue: updated,
    },
  });

  res.json({ success: true, data: updated });
};

exports.getBusinessIncomes = async (req, res) => {
  const borrowerId = Number(req.params.borrowerId);

  const list = await prisma.businessIncome.findMany({
    where: { borrowerId },
    orderBy: { monthYear: "desc" },
  });

  res.json({ success: true, data: list });
};

exports.deleteBusinessIncome = async (req, res) => {
  const userId = req.user.id;
  const id = Number(req.params.id);

  const old = await prisma.businessIncome.findUnique({ where: { id } });
  if (!old) return res.status(404).json({ success: false });

  await prisma.businessIncome.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "DELETE",
      entityType: "BusinessIncome",
      entityId: id,
      oldValue: old,
    },
  });

  res.json({ success: true });
};

// helper: escape HTML กันพัง
const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const formatMoney = (v) => {
  const n = Number(v || 0);
  return n.toLocaleString("lo-LA");
};

exports.exportBusinessIncomePdf = async (req, res) => {
  try {
    const borrowerId = Number(req.params.borrowerId);
    if (!borrowerId || Number.isNaN(borrowerId)) {
      return res.status(400).json({ success: false, message: "borrowerId ບໍ່ຖືກຕ້ອງ" });
    }

    // 1) โหลด borrower (เอาชื่อไปใส่หัวรายงาน)
    const borrower = await prisma.borrower.findUnique({
      where: { id: borrowerId },
      select: {
        id: true,
        title: true,
        firstName: true,
        lastName: true,
       businessRegisterName: true,        
    businessRegistrationNumber: true,   
      },
    });

    if (!borrower) {
      return res.status(404).json({ success: false, message: "ບໍ່ພົບ borrower" });
    }

    // 2) โหลดรายการรายได้
    const items = await prisma.businessIncome.findMany({
      where: { borrowerId },
      orderBy: { monthYear: "asc" }, // เรียงเก่า->ใหม่
    });

    if (!items.length) {
      return res.status(400).json({ success: false, message: "ບໍ່ມີຂໍ້ມູນໃຫ້ export" });
    }

    // 3) ทำชื่อ borrower แบบลาว
    const titleText = borrower.title === "THAO" ? "ທ້າວ" : borrower.title === "NANG" ? "ນາງ" : "";
    const borrowerName = `${titleText} ${borrower.firstName || ""} ${borrower.lastName || ""}`.trim();

    // 4) เตรียมตาราง (HTML)
    const months = items.map((r) => esc(r.monthYear).replace("-", "/"));

    const avg = (arr) => Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);

    const sales = items.map((r) => Number(r.saleRevenue || 0));
    const cogs = items.map((r) => Number(r.costOfSale || 0));
    const gp = items.map((r) => Number(r.grossProfit || 0));
    const opex = items.map((r) => Number(r.operExpense || 0));
    const np = items.map((r) => Number(r.netProfit || 0));

    // ถ้าคุณต้องการ “กำไรก่อนภาษี” ให้ใช้ gp - opex (หรือ field อื่นถ้ามี)
    const pbt = items.map((r) => Number(r.grossProfit || 0) - Number(r.operExpense || 0));

    // ภาษี: ถ้าไม่มี field tax จริง ๆ ให้คำนวณ 10% เป็นตัวอย่าง
    const tax = items.map((r) => Math.round(Number(r.netProfit || 0) * 0.10));

    const row = (label, arr) => `
      <tr>
        <td class="label">${esc(label)}</td>
        ${arr.map((v) => `<td class="num">${formatMoney(v)}</td>`).join("")}
        <td class="num avg">${formatMoney(avg(arr))}</td>
      </tr>
    `;

    // 5) optional: รับรูปกราฟจาก client (base64) เพื่อใส่ในรายงาน
    // ส่งจาก client เป็น req.body.chartDataUrl (data:image/png;base64,...)
    const chartDataUrl = req.body?.chartDataUrl || null;

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    /* ฟอนต์ลาวแบบ browser (สวยสุด) */
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Lao+Looped:wght@400;600;700&display=swap');

    body { font-family: "Noto Sans Lao Looped", sans-serif; padding: 18px; color: #111; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; gap: 16px; }
    .title { font-size: 18px; font-weight: 700; margin: 0; }
    .meta { font-size: 12px; color:#444; margin-top: 4px; line-height: 1.4; }

    .box { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; margin-top: 12px; }
    .chart { margin-top: 10px; }
    .chart img { width: 100%; max-height: 320px; object-fit: contain; border: 1px solid #e5e7eb; border-radius: 10px; }

    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
    th, td { border: 1px solid #e5e7eb; padding: 8px; }
    thead th { background: #dbeafe; font-weight: 700; text-align: center; }
    td.label { background: #f8fafc; font-weight: 600; white-space: nowrap; }
    td.num { text-align: right; white-space: nowrap; }
    td.avg { font-weight: 700; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">ໃບລາຍງານລາຍຮັບ ທຸລະກິດ</h1>
      <div class="meta">
        Borrower ID: ${borrowerId}<br/>
        ລູກຄ້າ: ${esc(borrowerName || "-")}<br/>
      Business: ${esc(borrower.businessRegisterName || "-")}<br/>

        Reg No: ${esc(borrower.businessRegistrationNumber || "-")}<br/>
        Date: ${esc(new Date().toLocaleString("lo-LA"))}
      </div>
    </div>
  </div>

  <div class="box">
    <div style="font-weight:700;">ຕາຕະລາງລາຍຮັບ 6 ເດືອນ</div>

    ${chartDataUrl ? `<div class="chart"><img src="${chartDataUrl}" /></div>` : ""}

    <table>
      <thead>
        <tr>
          <th style="text-align:left">ລາຍການ</th>
          ${months.map((m) => `<th>${m}</th>`).join("")}
          <th>Avg.</th>
        </tr>
      </thead>
      <tbody>
        ${row("ລາຍຮັບຈາກການຂາຍ", sales)}
        ${row("ຕົ້ນທຶນຂາຍສິນຄ້າ", cogs)}
        ${row("ກໍາໄລຂັ້ນຕົ້ນ", gp)}
        ${row("ຄ່າໃຊ້ຈ່າຍ", opex)}
        ${row("ກໍາໄລກ່ອນຫັກອາກອນ", pbt)}
        ${row("ອາກອນ", tax)}
        ${row("ກໍາໄລສຸດທິ", np)}
      </tbody>
    </table>
  </div>
</body>
</html>
    `;

    // 6) Puppeteer render -> PDF
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
    });

    await browser.close();

  res.setHeader("Content-Type", "application/pdf");
res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
res.setHeader("Content-Length", pdfBuffer.length);
console.log("PDF magic:", pdfBuffer.slice(0, 5).toString()); // ต้องเป็น %PDF-

return res.status(200).end(pdfBuffer);
   
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "System error" });
  }
};
