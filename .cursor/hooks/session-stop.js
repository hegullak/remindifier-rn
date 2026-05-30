#!/usr/bin/env node
/**
 * stop hook — when the agent finishes a turn with uncommitted work,
 * auto-submit a handoff prompt so session state gets persisted.
 *
 * Output: { "followup_message": "..." } or {}
 */
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

let input = {};
try {
  const raw = fs.readFileSync(0, "utf8");
  if (raw.trim()) input = JSON.parse(raw);
} catch {
  // ignore malformed stdin
}

const loopCount = input.loop_count ?? 0;
const status = input.status ?? "completed";

if (loopCount > 0 || status !== "completed") {
  process.stdout.write("{}");
  process.exit(0);
}

const root = process.cwd();
const stateFile = "claude-current-remindifier-state.md";

function git(args) {
  try {
    return execSync(`git ${args}`, {
      cwd: root,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return "";
  }
}

const dirty = git("status --porcelain");
if (!dirty) {
  process.stdout.write("{}");
  process.exit(0);
}

const dirtyLines = dirty.split("\n").filter(Boolean);
const onlyStateDirty =
  dirtyLines.length === 1 && dirtyLines[0].includes(stateFile);

if (onlyStateDirty) {
  process.stdout.write("{}");
  process.exit(0);
}

const followup_message = [
  "SESSION HANDOFF (mandatory — do not start new feature work):",
  `Update ${stateFile} with what was done this session (follow .cursor/skills/project-memory/SKILL.md).`,
  "Update PROJECT_MEMORY.md only if architecture or conventions changed.",
  "Then stage, commit, and push to origin/sandbox.",
  "Never commit .env, coverage/, or expo-output.log.",
].join(" ");

process.stdout.write(JSON.stringify({ followup_message }));
process.exit(0);
