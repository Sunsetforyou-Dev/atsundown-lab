import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCaptionPrompt,
  generateCaptions,
  parseCaptionArgs,
} from "../src/caption.js";

test("buildCaptionPrompt includes required three styles", () => {
  const prompt = buildCaptionPrompt("HUD Script", "590 บาท");

  assert.match(prompt, /Direct:/);
  assert.match(prompt, /Minimal:/);
  assert.match(prompt, /Gen-Z:/);
  assert.match(prompt, /HUD Script/);
  assert.match(prompt, /590 บาท/);
});

test("parseCaptionArgs reads script and price", () => {
  assert.deepEqual(parseCaptionArgs(["--script", "HUD Script", "--price", "590 บาท"]), {
    script: "HUD Script",
    price: "590 บาท",
  });
});

test("generateCaptions uses injected text generator", async () => {
  const result = await generateCaptions({
    script: "HUD Script",
    price: "590 บาท",
    textGenerator: async ({ prompt }) => {
      assert.match(prompt, /HUD Script/);
      return "Direct: test\n\nMinimal: test\n\nGen-Z: test";
    },
  });

  assert.match(result, /Direct:/);
});
