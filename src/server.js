import "dotenv/config";

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CHAT_MODEL, PORT, ROOT_DIR } from "./config.js";
import { generateText } from "./gemini.js";
import { RAGEngine } from "./rag.js";
import { getScripts, logOrder, ValidationError } from "./orders.js";

const FALLBACK_ANSWER =
  "ตอนนี้ยังไม่มีข้อมูลนี้ในระบบ กรุณาติดต่อ Discord ของ AtSundown";

const CHAT_PROVIDER_ERROR =
  "ระบบแชตยังเชื่อมต่อ AI ไม่สำเร็จ กรุณาตรวจสอบ GOOGLE_API_KEY และ GEMINI_EMBEDDING_MODEL แล้วลองใหม่อีกครั้ง";

export function buildPrompt(context, question) {
  return `
คุณคือ Demi ผู้ช่วย AI ของร้าน AtSundown ร้านขายสคริปต์สำเร็จรูป FiveM
ตอบเป็นภาษาไทยแบบสุภาพ กระชับ และเน้นช่วยลูกค้าเลือกสคริปต์สำเร็จรูปที่เหมาะสม

กฎสำคัญ:
- AtSundown จำหน่ายเฉพาะสคริปต์สำเร็จรูป FiveM เท่านั้น
- ตอนนี้ AtSundown ยังไม่รับงานเขียนสคริปต์ custom, ไม่รับแก้ไขสคริปต์เดิม, และไม่รับต่อยอดระบบเฉพาะ
- ตอบจากข้อมูลร้านด้านล่างเท่านั้น
- ถ้าไม่มีข้อมูลในข้อมูลร้าน ให้บอกว่า "ตอนนี้ยังไม่มีข้อมูลนี้ในระบบ" และแนะนำให้ติดต่อ Discord ของ AtSundown
- ห้ามแต่งราคา เงื่อนไข ระยะเวลา หรือรายละเอียดทางเทคนิคเอง
- ถ้าลูกค้าสนใจซื้อ ให้ชวนกรอกฟอร์มสั่งซื้อสคริปต์ในหน้านี้

ข้อมูลร้าน:
${context}

คำถามลูกค้า: ${question}
`.trim();
}

export async function createApp({
  ragLoader = () => RAGEngine.fromFile(),
  textGenerator = generateText,
  orderLogger = logOrder,
} = {}) {
  const app = express();
  let ragPromise;

  app.use(express.json({ limit: "1mb" }));
  app.use(express.static(`${ROOT_DIR}/public`));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/scripts", (_req, res) => {
    res.json({ scripts: getScripts() });
  });

  app.post("/api/chat", async (req, res, next) => {
    try {
      const message = String(req.body?.message || "").trim();
      if (!message) {
        throw new ValidationError("กรุณากรอกข้อความก่อนส่งแชต");
      }

      ragPromise ||= Promise.resolve(ragLoader());
      const rag = await ragPromise;
      const contextChunks = await rag.search(message, 3);
      const prompt = buildPrompt(contextChunks.join("\n---\n"), message);
      const answer =
        (await textGenerator({ prompt, model: CHAT_MODEL })) || FALLBACK_ANSWER;

      res.json({ answer });
    } catch (error) {
      if (error instanceof ValidationError) {
        next(error);
        return;
      }

      next(new Error(CHAT_PROVIDER_ERROR));
    }
  });

  app.post("/api/orders", async (req, res, next) => {
    try {
      const result = await orderLogger({ input: req.body || {} });
      res.status(201).json({
        ok: true,
        timestamp: result.timestamp,
        order: {
          discord: result.order.discord,
          script: result.order.script,
          price: result.order.price,
          status: result.order.status,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  app.use((error, _req, res, _next) => {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: error.message || "Internal server error",
    });
  });

  return app;
}

const entrypointPath = path.normalize(path.resolve(process.argv[1] || "")).toLowerCase();
const modulePath = path.normalize(fileURLToPath(import.meta.url)).toLowerCase();

if (entrypointPath === modulePath) {
  const app = await createApp();
  app.listen(PORT, () => {
    console.log(`AtSundown app is running at http://localhost:${PORT}`);
  });
}
