import test from "node:test";
import assert from "node:assert/strict";

import { parseActionResponse, runAgentCommand, SYSTEM_INSTRUCTION } from "../src/agent.js";

test("SYSTEM_INSTRUCTION lists current product names", () => {
  assert.match(SYSTEM_INSTRUCTION, /sundown_syncobject/);
  assert.match(SYSTEM_INSTRUCTION, /sundown_discordjob/);
  assert.match(SYSTEM_INSTRUCTION, /sundown_deleteobj/);
  assert.doesNotMatch(SYSTEM_INSTRUCTION, /HUD Script/);
});

test("parseActionResponse parses raw JSON", () => {
  assert.deepEqual(parseActionResponse('{"action":"unknown","args":{}}'), {
    action: "unknown",
    args: {},
  });
});

test("parseActionResponse parses fenced JSON", () => {
  assert.deepEqual(
    parseActionResponse('```json\n{"action":"unknown","args":{}}\n```'),
    {
      action: "unknown",
      args: {},
    },
  );
});

test("runAgentCommand submits script order with mocked Gemini and logger", async () => {
  const traces = [];
  const result = await runAgentCommand({
    userInput: "สั่ง sundown_deleteobj",
    textGenerator: async () =>
      JSON.stringify({
        action: "submit_script_order",
        args: {
          discord: "demo#1234",
          script: "sundown_deleteobj",
          details: "ESX",
        },
      }),
    orderLogger: async ({ input }) => ({
      timestamp: "2026-05-26 12:00:00",
      order: {
        discord: input.discord,
        script: input.script,
        price: 1200,
      },
    }),
    traceWriter: async (event, data) => traces.push({ event, data }),
  });

  assert.equal(result, "Order submitted: demo#1234 - sundown_deleteobj (1,200 THB)");
  assert.equal(traces.at(-1).event, "tool_result");
});

test("runAgentCommand reports invalid JSON", async () => {
  const result = await runAgentCommand({
    userInput: "hello",
    textGenerator: async () => "not json",
    traceWriter: async () => {},
  });

  assert.equal(result, "AI returned invalid JSON.");
});
