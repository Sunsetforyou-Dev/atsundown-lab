import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCaptionPrompt,
  generateCaptions,
  parseCaptionArgs,
} from "../src/caption.js";

test("buildCaptionPrompt includes required three styles", () => {
  const prompt = buildCaptionPrompt("sundown_deleteobj", "1,200 บาท");

  assert.match(prompt, /Direct:/);
  assert.match(prompt, /Minimal:/);
  assert.match(prompt, /Gen-Z:/);
  assert.match(prompt, /sundown_deleteobj/);
  assert.match(prompt, /1,200 บาท/);
});

test("parseCaptionArgs reads script and price", () => {
  assert.deepEqual(
    parseCaptionArgs(["--script", "sundown_deleteobj", "--price", "1,200 บาท"]),
    {
      script: "sundown_deleteobj",
      price: "1,200 บาท",
    },
  );
});

test("generateCaptions uses injected text generator", async () => {
  const result = await generateCaptions({
    script: "sundown_deleteobj",
    price: "1,200 บาท",
    textGenerator: async ({ prompt }) => {
      assert.match(prompt, /sundown_deleteobj/);
      return "Direct: test\n\nMinimal: test\n\nGen-Z: test";
    },
  });

  assert.match(result, /Direct:/);
});
