import fs from "node:fs";

import { google } from "googleapis";

export const SHEET_HEADERS = [
  "Timestamp",
  "Discord",
  "Script",
  "Price",
  "Details",
  "Status",
];

export const SCRIPT_PRICES = {
  "HUD Script": 590,
  "Job Script": 990,
  "Shop/Inventory Script": 1290,
  "Gang/Activity Script": 1590,
};

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
  }
}

export function getScripts() {
  return Object.entries(SCRIPT_PRICES).map(([name, price]) => ({ name, price }));
}

export function validateOrder(order) {
  const discord = String(order.discord || "").trim();
  const script = String(order.script || "").trim();
  const details = String(order.details || "").trim();

  if (!discord) {
    throw new ValidationError("กรุณากรอก Discord สำหรับติดต่อกลับ");
  }

  if (!Object.hasOwn(SCRIPT_PRICES, script)) {
    throw new ValidationError("สคริปต์ที่เลือกไม่ถูกต้อง");
  }

  if (!details) {
    throw new ValidationError("กรุณากรอกรายละเอียดเซิร์ฟเวอร์หรือหมายเหตุ");
  }

  return {
    discord,
    script,
    details,
    status: order.status || "new",
    price: SCRIPT_PRICES[script],
  };
}

export function buildRow(order, timestamp) {
  return [
    timestamp,
    order.discord,
    order.script,
    order.price,
    order.details,
    order.status,
  ];
}

export function formatTimestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day} ${value.hour}:${value.minute}:${value.second}`;
}

export function requireEnv(name) {
  const value = (process.env[name] || "").trim();
  if (!value) {
    throw new Error(`Missing ${name}. Add it to your .env file.`);
  }
  return value;
}

export function getGoogleCredentials() {
  const rawJson = (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "").trim();
  const filePath = (process.env.GOOGLE_SERVICE_ACCOUNT_FILE || "").trim();

  if (rawJson) {
    return JSON.parse(rawJson);
  }

  if (filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  }

  throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_FILE.");
}

export function createSheetsClient() {
  const credentials = getGoogleCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [SHEETS_SCOPE],
  });

  return google.sheets({ version: "v4", auth });
}

export async function ensureSheetHeaders({ sheets, spreadsheetId }) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "A1:F1",
  });

  const existingHeaders = response.data.values?.[0] || [];

  if (existingHeaders.length === 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "A1:F1",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [SHEET_HEADERS],
      },
    });
    return;
  }

  if (existingHeaders.join("\u0000") !== SHEET_HEADERS.join("\u0000")) {
    throw new Error(
      `Google Sheet headers do not match. Expected: ${SHEET_HEADERS.join(", ")}`,
    );
  }
}

export async function appendOrderRow({ sheets, spreadsheetId, row }) {
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "A:F",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [row],
    },
  });
}

export function formatOrderMessage(order, timestamp) {
  return [
    "มีออเดอร์สคริปต์ FiveM ใหม่จาก AtSundown",
    "",
    `เวลา: ${timestamp}`,
    `Discord: ${order.discord}`,
    `Script: ${order.script}`,
    `ราคา: ${order.price.toLocaleString("th-TH")} บาท`,
    `สถานะ: ${order.status}`,
    "",
    "รายละเอียด:",
    order.details,
  ].join("\n");
}

export async function sendTelegramMessage(message) {
  const token = requireEnv("TELEGRAM_BOT_TOKEN");
  const chatId = requireEnv("TELEGRAM_CHAT_ID");

  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    },
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.description || "Telegram API error");
  }
}

export async function logOrder({
  input,
  sheets = createSheetsClient(),
  sendMessage = sendTelegramMessage,
  now = () => new Date(),
}) {
  const spreadsheetId = requireEnv("GOOGLE_SHEETS_ID");
  const order = validateOrder(input);
  const timestamp = formatTimestamp(now());

  await ensureSheetHeaders({ sheets, spreadsheetId });
  await appendOrderRow({
    sheets,
    spreadsheetId,
    row: buildRow(order, timestamp),
  });
  await sendMessage(formatOrderMessage(order, timestamp));

  return { order, timestamp };
}
