#!/usr/bin/env node
/**
 * sessionStart hook — inject project memory into agent context.
 * Output: { "additional_context": "..." }
 */
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const MAX_CHARS = 14_000;

const files = ["claude-current-remindifier-state.md", "PROJECT_MEMORY.md"];

const parts = [];
for (const name of files) {
  const filePath = path.join(root, name);
  if (!fs.existsSync(filePath)) continue;
  const body = fs.readFileSync(filePath, "utf8");
  parts.push(`### ${name}\n\n${body}`);
}

const protocol = [
  "SESSION PROTOCOL:",
  "1. Use the project memory below as ground truth.",
  "2. Update claude-current-remindifier-state.md only when the user explicitly requests SESSION HANDOFF.",
  "3. Update PROJECT_MEMORY.md only when conventions or structure change.",
  "4. Start substantive work: git pull --rebase origin sandbox.",
  "5. Commit/push only when the user asks — not after every agent turn.",
  "6. Never create ad-hoc context files unless the user explicitly asks.",
].join("\n");

let additional_context = `<remindifier_project_memory>\n${protocol}\n\n${parts.join("\n\n---\n\n")}\n</remindifier_project_memory>`;

if (additional_context.length > MAX_CHARS) {
  additional_context = `${additional_context.slice(0, MAX_CHARS)}\n\n… (truncated)\n</remindifier_project_memory>`;
}

process.stdout.write(JSON.stringify({ additional_context }));
