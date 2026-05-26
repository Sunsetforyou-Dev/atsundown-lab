import { CHAT_MODEL } from "./config.js";
import { generateText } from "./gemini.js";

export function buildCaptionPrompt(scriptName, price) {
  return `
You are writing short promotional captions for AtSundown, a FiveM script shop.

Generate exactly 3 short caption variants in Thai for this ready-made script:
- Script: ${scriptName}
- Price: ${price}

Requirements:
- Output must be in Thai.
- Each caption must naturally mention both the script and the price.
- Mention that customers can order via AtSundown or contact Discord ของ AtSundown.
- Keep the tone suitable for a FiveM community.
- Create these 3 styles only:
  1. Direct
  2. Minimal
  3. Gen-Z
- Do not add explanations or extra notes.

Format exactly:
Direct: <caption>

Minimal: <caption>

Gen-Z: <caption>
`.trim();
}

export async function generateCaptions({
  script,
  price,
  textGenerator = generateText,
  model = CHAT_MODEL,
}) {
  const scriptName = String(script || "").trim();
  const priceText = String(price || "").trim();

  if (!scriptName) {
    throw new Error("Missing --script.");
  }

  if (!priceText) {
    throw new Error("Missing --price.");
  }

  const text = await textGenerator({
    model,
    prompt: buildCaptionPrompt(scriptName, priceText),
  });

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

export function parseCaptionArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === "--script") {
      args.script = argv[index + 1];
      index += 1;
    } else if (current === "--price") {
      args.price = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${current}`);
    }
  }

  return args;
}
