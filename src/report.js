import { createSheetsClient, requireEnv, sendTelegramMessage } from "./orders.js";

export const REPORT_COLUMNS = ["Date", "Menu", "Qty", "Total"];
export const BANGKOK_TIME_ZONE = "Asia/Bangkok";

export function parseSheetDate(value) {
  const text = String(value || "").trim();
  if (!text) {
    return null;
  }

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    const year = slashMatch[3];
    const day = first > 12 ? first : second;
    const month = first > 12 ? second : first;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.valueOf())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

export function parseDecimal(value) {
  const cleaned = String(value ?? "")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "")
    .trim();

  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") {
    return 0;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function yesterdayBangkok(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const bangkokNoonUtc = new Date(`${value.year}-${value.month}-${value.day}T05:00:00.000Z`);
  bangkokNoonUtc.setUTCDate(bangkokNoonUtc.getUTCDate() - 1);
  return bangkokNoonUtc.toISOString().slice(0, 10);
}

export function validateReportColumns(rows) {
  if (rows.length === 0) {
    return;
  }

  const missing = REPORT_COLUMNS.filter((column) => !(column in rows[0]));
  if (missing.length > 0) {
    throw new Error(
      `Missing required Google Sheet columns: ${missing.join(", ")}. Expected headers: ${REPORT_COLUMNS.join(", ")}`,
    );
  }
}

export function summarizeSales(rows, targetDate) {
  validateReportColumns(rows);

  let totalSales = 0;
  let rowCount = 0;
  const itemQuantities = new Map();

  for (const row of rows) {
    if (parseSheetDate(row.Date) !== targetDate) {
      continue;
    }

    rowCount += 1;
    const menuName = String(row.Menu || "").trim() || "ไม่ระบุเมนู";
    const qty = parseDecimal(row.Qty);
    totalSales += parseDecimal(row.Total);
    itemQuantities.set(menuName, (itemQuantities.get(menuName) || 0) + qty);
  }

  let topMenu = null;
  let topQty = 0;
  for (const [menuName, qty] of itemQuantities.entries()) {
    if (qty > topQty || (qty === topQty && topMenu && menuName < topMenu)) {
      topMenu = menuName;
      topQty = qty;
    }
  }

  return {
    date: targetDate,
    rowCount,
    totalSales,
    topMenu,
    topQty,
  };
}

export function formatNumber(value) {
  return Number.isInteger(value)
    ? value.toLocaleString("en-US")
    : value.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
}

export function buildReportMessage(summary) {
  if (summary.rowCount === 0) {
    return [
      `อรุณสวัสดิ์ครับ`,
      `รายงานของเมื่อวาน (${summary.date}) ยังไม่มีรายการขาย`,
      "วันนี้มาเริ่มวันใหม่ให้ปังกันครับ",
    ].join("\n");
  }

  return [
    `มอร์นิ่งครับ สรุปยอดขายเมื่อวาน (${summary.date}) มาแล้ว`,
    "",
    `ยอดขายรวม: ${formatNumber(summary.totalSales)} บาท`,
    `จำนวนรายการ: ${summary.rowCount.toLocaleString("en-US")} รายการ`,
    `เมนูขายดีที่สุด: ${summary.topMenu || "ไม่ระบุเมนู"} (${formatNumber(summary.topQty)} ชิ้น)`,
    "",
    "ขอให้วันนี้ขายดีครับ",
  ].join("\n");
}

export function rowsFromValues(values) {
  const [headers = [], ...body] = values || [];
  return body
    .filter((row) => row.some((cell) => String(cell || "").trim()))
    .map((row) =>
      Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])),
    );
}

export async function getSheetRecords({ sheets = createSheetsClient(), spreadsheetId }) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "A:Z",
  });

  return rowsFromValues(response.data.values || []);
}

export async function sendMorningReport({
  sheets = createSheetsClient(),
  sendMessage = sendTelegramMessage,
  now = new Date(),
} = {}) {
  const spreadsheetId = requireEnv("GOOGLE_SHEETS_ID");
  const rows = await getSheetRecords({ sheets, spreadsheetId });
  const summary = summarizeSales(rows, yesterdayBangkok(now));
  const message = buildReportMessage(summary);
  await sendMessage(message);
  return summary;
}
