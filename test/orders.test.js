import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRow,
  formatTimestamp,
  getScripts,
  logOrder,
  validateOrder,
  ValidationError,
} from "../src/orders.js";

test("getScripts returns four script options", () => {
  assert.equal(getScripts().length, 4);
});

test("validateOrder rejects missing discord", () => {
  assert.throws(
    () =>
      validateOrder({
        discord: "",
        script: "HUD Script",
        details: "ESX",
      }),
    ValidationError,
  );
});

test("validateOrder rejects invalid script", () => {
  assert.throws(
    () =>
      validateOrder({
        discord: "demo#1234",
        script: "Custom Script",
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
        script: "HUD Script",
        details: "",
      }),
    ValidationError,
  );
});

test("buildRow includes timestamp, price, and status", () => {
  const order = validateOrder({
    discord: " demo#1234 ",
    script: "HUD Script",
    details: " ESX ",
  });

  assert.deepEqual(buildRow(order, "2026-05-26 12:00:00"), [
    "2026-05-26 12:00:00",
    "demo#1234",
    "HUD Script",
    590,
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
      script: "Job Script",
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
    "Job Script",
    990,
    "QBCore",
    "new",
  ]);
  assert.match(messages[0], /Job Script/);

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
