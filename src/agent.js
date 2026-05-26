import fs from "node:fs/promises";

import { CHAT_MODEL } from "./config.js";
import { generateText } from "./gemini.js";
import { getScripts, logOrder } from "./orders.js";

export const TRACE_FILE = "agent_trace.log";

export const SYSTEM_INSTRUCTION = `
You are Demi, an action parser for AtSundown FiveM.
Convert Thai or English customer order commands into one raw JSON object.

Use this action format when the user wants to submit a ready-made FiveM script order:
{"action": "submit_script_order", "args": {"discord": "...", "script": "...", "details": "..."}}

Allowed script values:
${getScripts().map((product) => `- ${product.name}`).join("\n")}

If the command is not a ready-made script order, return:
{"action": "unknown", "args": {}}

Return only raw JSON. Do not wrap the response in markdown or code fences.
`.trim();

export function parseActionResponse(raw) {
  let text = String(raw || "").trim();

  if (text.startsWith("```")) {
    const lines = text.split(/\r?\n/);
    if (lines[0]?.trim().startsWith("```")) {
      lines.shift();
    }
    if (lines.at(-1)?.trim() === "```") {
      lines.pop();
    }
    text = lines.join("\n").trim();
  }

  return JSON.parse(text);
}

export async function writeTrace(event, data, traceFile = TRACE_FILE) {
  const record = {
    timestamp: new Date().toISOString(),
    event,
    ...data,
  };
  await fs.appendFile(traceFile, `${JSON.stringify(record)}\n`, "utf8");
}

export async function submitScriptOrder(args, orderLogger = logOrder) {
  const result = await orderLogger({ input: args });
  return {
    status: "success",
    discord: result.order.discord,
    script: result.order.script,
    price: result.order.price,
    timestamp: result.timestamp,
  };
}

export async function runAgentCommand({
  userInput,
  textGenerator = generateText,
  orderLogger = logOrder,
  traceWriter = writeTrace,
  model = CHAT_MODEL,
}) {
  await traceWriter("user_input", { message: userInput });

  const raw = await textGenerator({
    model,
    prompt: `${SYSTEM_INSTRUCTION}\n\nCommand: ${userInput}`,
  });
  await traceWriter("llm_response", { raw });

  let actionData;
  try {
    actionData = parseActionResponse(raw);
  } catch {
    return "AI returned invalid JSON.";
  }

  const action = actionData.action;
  const args = actionData.args || {};

  if (action !== "submit_script_order") {
    return `Unknown action: ${action}`;
  }

  try {
    const result = await submitScriptOrder(args, orderLogger);
    await traceWriter("tool_result", { action, result });
    return `Order submitted: ${result.discord} - ${result.script} (${result.price.toLocaleString("en-US")} THB)`;
  } catch (error) {
    await traceWriter("tool_error", { action, error: error.message });
    return `Invalid order: ${error.message}`;
  }
}
