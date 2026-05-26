import { GoogleGenAI } from "@google/genai";

let client;

export function getGeminiClient() {
  const apiKey = (process.env.GOOGLE_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("Missing GOOGLE_API_KEY. Add it to your .env file.");
  }

  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }

  return client;
}

export async function generateText({ prompt, model, ai = getGeminiClient() }) {
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return (response.text || "").trim();
}

export async function embedTexts({ texts, model, ai = getGeminiClient() }) {
  const embeddings = [];

  for (const text of texts) {
    const response = await ai.models.embedContent({
      model,
      contents: text,
    });

    const [embedding] = response.embeddings || [];
    embeddings.push(embedding?.values || []);
  }

  return embeddings;
}
