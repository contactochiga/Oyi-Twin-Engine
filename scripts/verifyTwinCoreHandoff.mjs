import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const controller = await readFile(new URL("../src/engine/twinIntelligence.ts", import.meta.url), "utf8");
const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");

assert.match(controller, /export type CoreConversationHandoff/, "Twin must expose a host-owned Core handoff contract");
assert.match(controller, /if \(this\.coreConversationHandoff\)/, "unknown turns must delegate when an authenticated host transport is supplied");
assert.match(controller, /handoff_required: true/, "an unconfigured host must disclose the handoff requirement");
assert.doesNotMatch(controller, /openai|anthropic|gemini|chat\.completions|responses\.create/i, "Twin must not add a provider-backed general conversation runtime");
assert.doesNotMatch(app, /https?:\/\/.*oyi|fetch\([^)]*conversation/i, "Twin host must not invent an unauthenticated Core endpoint");

console.log("PASS Twin unknown-turn Core handoff boundary");
