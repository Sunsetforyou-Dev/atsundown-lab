import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { generateCaptions, parseCaptionArgs } from "../caption.js";

export async function main(argv = process.argv.slice(2)) {
  try {
    const args = parseCaptionArgs(argv);
    const captions = await generateCaptions(args);
    console.log(captions);
    return 0;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return 1;
  }
}

const entrypointPath = path.normalize(path.resolve(process.argv[1] || "")).toLowerCase();
const modulePath = path.normalize(fileURLToPath(import.meta.url)).toLowerCase();

if (entrypointPath === modulePath) {
  process.exitCode = await main();
}
