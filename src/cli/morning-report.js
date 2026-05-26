import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { sendMorningReport } from "../report.js";

export async function main() {
  try {
    await sendMorningReport();
    console.log("Morning report sent to Telegram.");
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
