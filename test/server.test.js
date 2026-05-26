import test from "node:test";
import assert from "node:assert/strict";

import request from "supertest";

import { createApp } from "../src/server.js";

function createTestApp() {
  return createApp({
    ragLoader: async () => ({
      search: async () => ["HUD Script ราคา 590 บาท"],
    }),
    textGenerator: async ({ prompt }) => `answer from ${prompt.includes("HUD Script")}`,
    orderLogger: async ({ input }) => ({
      timestamp: "2026-05-26 12:00:00",
      order: {
        discord: input.discord,
        script: input.script,
        price: 590,
        status: "new",
      },
    }),
  });
}

test("GET /api/scripts returns four scripts", async () => {
  const app = await createTestApp();
  const response = await request(app).get("/api/scripts").expect(200);

  assert.equal(response.body.scripts.length, 4);
});

test("POST /api/chat hides raw provider errors", async () => {
  const app = await createApp({
    ragLoader: async () => {
      throw new Error(
        '{"error":{"code":404,"message":"models/text-embedding-004 is not found"}}',
      );
    },
  });
  const response = await request(app)
    .post("/api/chat")
    .send({ message: "สวัสดี" })
    .expect(500);

  assert.match(response.body.error, /ระบบแชตยังเชื่อมต่อ AI ไม่สำเร็จ/);
  assert.doesNotMatch(response.body.error, /text-embedding-004/);
});

test("POST /api/chat returns mocked answer", async () => {
  const app = await createTestApp();
  const response = await request(app)
    .post("/api/chat")
    .send({ message: "HUD ราคาเท่าไหร่" })
    .expect(200);

  assert.equal(response.body.answer, "answer from true");
});

test("POST /api/orders returns created order", async () => {
  const app = await createTestApp();
  const response = await request(app)
    .post("/api/orders")
    .send({
      discord: "demo#1234",
      script: "HUD Script",
      details: "ESX",
    })
    .expect(201);

  assert.equal(response.body.timestamp, "2026-05-26 12:00:00");
  assert.equal(response.body.order.script, "HUD Script");
});

test("POST /api/chat rejects empty message", async () => {
  const app = await createTestApp();
  const response = await request(app).post("/api/chat").send({ message: "" }).expect(400);

  assert.match(response.body.error, /กรุณากรอกข้อความ/);
});
