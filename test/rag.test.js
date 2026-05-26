import test from "node:test";
import assert from "node:assert/strict";

import { EMBEDDING_MODEL } from "../src/config.js";
import {
  chunkKnowledgeBase,
  cosineSimilarity,
  formatDocumentForEmbedding,
  formatQueryForEmbedding,
  RAGEngine,
} from "../src/rag.js";

test("default embedding model uses current Gemini embedding model", () => {
  assert.equal(EMBEDDING_MODEL, "gemini-embedding-001");
});

test("chunkKnowledgeBase splits on blank lines", () => {
  assert.deepEqual(chunkKnowledgeBase("A\n\nB\r\n\r\n C "), ["A", "B", "C"]);
});

test("cosineSimilarity scores identical vectors highest", () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
});

test("embedding formatters add document and query prefixes", () => {
  assert.equal(
    formatDocumentForEmbedding("sundown_deleteobj"),
    "title: AtSundown KB | text: sundown_deleteobj",
  );
  assert.equal(
    formatQueryForEmbedding("ราคาเท่าไหร่"),
    "task: question answering | query: ราคาเท่าไหร่",
  );
});

test("RAGEngine search returns nearest chunks", async () => {
  const embeddedInputs = [];
  const engine = new RAGEngine({
    chunks: ["sundown_deleteobj price 1200 THB", "sundown_discordjob price 500 THB"],
    embeddings: [
      [1, 0],
      [0, 1],
    ],
    embedder: async ({ texts }) => {
      embeddedInputs.push(...texts);
      return [[0.95, 0.05]];
    },
  });

  assert.deepEqual(await engine.search("deleteobj price", 1), [
    "sundown_deleteobj price 1200 THB",
  ]);
  assert.equal(
    embeddedInputs[0],
    "task: question answering | query: deleteobj price",
  );
});
