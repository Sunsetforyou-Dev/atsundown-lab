import test from "node:test";
import assert from "node:assert/strict";

import {
  buildReportMessage,
  parseDecimal,
  parseSheetDate,
  rowsFromValues,
  sendMorningReport,
  summarizeSales,
  yesterdayBangkok,
} from "../src/report.js";

test("parseSheetDate supports common sheet formats", () => {
  assert.equal(parseSheetDate("2026-05-25"), "2026-05-25");
  assert.equal(parseSheetDate("25/05/2026"), "2026-05-25");
  assert.equal(parseSheetDate("05/25/2026"), "2026-05-25");
  assert.equal(parseSheetDate("2026-05-25T10:30:00"), "2026-05-25");
});

test("parseDecimal handles commas and currency text", () => {
  assert.equal(parseDecimal("1,290 บาท"), 1290);
  assert.equal(parseDecimal(""), 0);
});

test("summarizeSales totals rows and finds top menu", () => {
  const summary = summarizeSales(
    [
      { Date: "2026-05-25", Menu: "HUD", Qty: "2", Total: "1,180" },
      { Date: "2026-05-25", Menu: "Job", Qty: "1", Total: "990" },
      { Date: "2026-05-24", Menu: "HUD", Qty: "1", Total: "590" },
    ],
    "2026-05-25",
  );

  assert.deepEqual(summary, {
    date: "2026-05-25",
    rowCount: 2,
    totalSales: 2170,
    topMenu: "HUD",
    topQty: 2,
  });
});

test("rowsFromValues maps sheet rows to objects", () => {
  assert.deepEqual(rowsFromValues([["Date", "Menu"], ["2026-05-25", "HUD"]]), [
    { Date: "2026-05-25", Menu: "HUD" },
  ]);
});

test("buildReportMessage handles empty and non-empty summaries", () => {
  assert.match(
    buildReportMessage({ date: "2026-05-25", rowCount: 0 }),
    /ยังไม่มีรายการขาย/,
  );
  assert.match(
    buildReportMessage({
      date: "2026-05-25",
      rowCount: 1,
      totalSales: 590,
      topMenu: "HUD",
      topQty: 1,
    }),
    /HUD/,
  );
});

test("yesterdayBangkok returns previous Bangkok date", () => {
  assert.equal(yesterdayBangkok(new Date("2026-05-26T05:00:00.000Z")), "2026-05-25");
});

test("sendMorningReport reads sheet rows and sends Telegram message", async () => {
  const previousSheetId = process.env.GOOGLE_SHEETS_ID;
  process.env.GOOGLE_SHEETS_ID = "sheet-id";

  const sheets = {
    spreadsheets: {
      values: {
        get: async () => ({
          data: {
            values: [
              ["Date", "Menu", "Qty", "Total"],
              ["2026-05-25", "HUD", "1", "590"],
            ],
          },
        }),
      },
    },
  };
  const messages = [];
  const summary = await sendMorningReport({
    sheets,
    sendMessage: async (message) => messages.push(message),
    now: new Date("2026-05-26T05:00:00.000Z"),
  });

  assert.equal(summary.totalSales, 590);
  assert.match(messages[0], /HUD/);

  if (previousSheetId === undefined) {
    delete process.env.GOOGLE_SHEETS_ID;
  } else {
    process.env.GOOGLE_SHEETS_ID = previousSheetId;
  }
});
