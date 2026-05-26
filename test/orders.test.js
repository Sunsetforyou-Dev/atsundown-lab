import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRow,
  formatTimestamp,
  getProduct,
  getScripts,
  logOrder,
  validateOrder,
  ValidationError,
} from "../src/orders.js";

test("getScripts returns three current products with features", () => {
  const scripts = getScripts();
  assert.equal(scripts.length, 3);
  assert.equal(scripts[0].name, "sundown_syncobject");
  assert.equal(scripts[0].price, 1000);
  assert.ok(scripts[0].features.includes("ไม่ใช้ Network Object"));
});

test("getProduct returns product metadata", () => {
  assert.equal(getProduct("sundown_deleteobj").description, "ลบแฟชั่นลอย ออโต้");
});

test("validateOrder rejects missing discord", () => {
  assert.throws(
    () =>
      validateOrder({
        discord: "",
        script: "sundown_syncobject",
        details: "ESX",
      }),
    ValidationError,
  );
});

test("validateOrder rejects old or invalid script", () => {
  assert.throws(
    () =>
      validateOrder({
        discord: "demo#1234",
        script: "HUD Script",
        details: "ESX",
      }),
    ValidationError,
  );
});

test("validateOrder rejects missing details", () => {
  assert.throws(
    () =>
      validateOrder({
        discord: "demo#1234",
        script: "sundown_syncobject",
        details: "",
      }),
    ValidationError,
  );
});

test("buildRow includes timestamp, new product price, and status", () => {
  const order = validateOrder({
    discord: " demo#1234 ",
    script: "sundown_deleteobj",
    details: " ESX ",
  });

  assert.deepEqual(buildRow(order, "2026-05-26 12:00:00"), [
    "2026-05-26 12:00:00",
    "demo#1234",
    "sundown_deleteobj",
    1200,
    "ESX",
    "new",
  ]);
});

test("logOrder appends to sheets and sends Telegram message", async () => {
  const previousSheetId = process.env.GOOGLE_SHEETS_ID;
  process.env.GOOGLE_SHEETS_ID = "sheet-id";

  const calls = [];
  const sheets = {
    spreadsheets: {
      values: {
        get: async () => ({
          data: {
            values: [["Timestamp", "Discord", "Script", "Price", "Details", "Status"]],
          },
        }),
        append: async (request) => {
          calls.push(request);
        },
      },
    },
  };

  const messages = [];
  const result = await logOrder({
    input: {
      discord: "demo#1234",
      script: "sundown_discordjob",
      details: "QBCore",
    },
    sheets,
    sendMessage: async (message) => messages.push(message),
    now: () => new Date("2026-05-26T05:00:00.000Z"),
  });

  assert.equal(result.timestamp, "2026-05-26 12:00:00");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].requestBody.values[0], [
    "2026-05-26 12:00:00",
    "demo#1234",
    "sundown_discordjob",
    500,
    "QBCore",
    "new",
  ]);
  assert.match(messages[0], /sundown_discordjob/);
  assert.match(messages[0], /ระบบเพิ่มยศใน Discord/);

  if (previousSheetId === undefined) {
    delete process.env.GOOGLE_SHEETS_ID;
  } else {
    process.env.GOOGLE_SHEETS_ID = previousSheetId;
  }
});

test("formatTimestamp uses Asia/Bangkok time", () => {
  assert.equal(
    formatTimestamp(new Date("2026-05-26T05:00:00.000Z")),
    "2026-05-26 12:00:00",
  );
});
