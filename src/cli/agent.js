import "dotenv/config";

import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";

import { runAgentCommand } from "../agent.js";

export async function main() {
  const terminal = createInterface({ input, output });
  console.log("Demi Agent is ready. Type 'exit' to quit.\n");

  try {
    while (true) {
      const userInput = (await terminal.question("You: ")).trim();
      if (userInput.toLowerCase() === "exit") {
        return 0;
      }

      const result = await runAgentCommand({ userInput });
      console.log(`Demi: ${result}\n`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return 1;
  } finally {
    terminal.close();
  }
}

const entrypointPath = path.normalize(path.resolve(process.argv[1] || "")).toLowerCase();
const modulePath = path.normalize(fileURLToPath(import.meta.url)).toLowerCase();

if (entrypointPath === modulePath) {
  process.exitCode = await main();
}
