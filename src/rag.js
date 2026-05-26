import fs from "node:fs/promises";

import { EMBEDDING_MODEL, KB_PATH } from "./config.js";
import { embedTexts } from "./gemini.js";

const KB_TITLE = "AtSundown KB";

export function chunkKnowledgeBase(text) {
  return text
    .split(/\r?\n\s*\r?\n/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

export function formatDocumentForEmbedding(chunk) {
  return `title: ${KB_TITLE} | text: ${chunk}`;
}

export function formatQueryForEmbedding(query) {
  return `task: question answering | query: ${query}`;
}

export function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export class RAGEngine {
  constructor({ chunks, embeddings, embedder, embeddingModel = EMBEDDING_MODEL }) {
    this.chunks = chunks;
    this.embeddings = embeddings;
    this.embedder = embedder;
    this.embeddingModel = embeddingModel;
  }

  static async fromFile({
    kbPath = KB_PATH,
    embedder = embedTexts,
    embeddingModel = EMBEDDING_MODEL,
  } = {}) {
    const text = await fs.readFile(kbPath, "utf8");
    const chunks = chunkKnowledgeBase(text);

    if (chunks.length === 0) {
      throw new Error(`Knowledge base is empty: ${kbPath}`);
    }

    const embeddings = await embedder({
      texts: chunks.map(formatDocumentForEmbedding),
      model: embeddingModel,
    });

    return new RAGEngine({ chunks, embeddings, embedder, embeddingModel });
  }

  async search(query, topK = 3) {
    const [queryEmbedding] = await this.embedder({
      texts: [formatQueryForEmbedding(query)],
      model: this.embeddingModel,
    });

    return this.chunks
      .map((chunk, index) => ({
        chunk,
        score: cosineSimilarity(queryEmbedding, this.embeddings[index] || []),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((result) => result.chunk);
  }
}
