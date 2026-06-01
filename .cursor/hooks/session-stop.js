#!/usr/bin/env node
/**
 * stop hook — runs after each agent turn completes.
 *
 * Do NOT auto-submit SESSION HANDOFF here. That fired on every turn with
 * uncommitted git changes and caused repeated commit/push loops during normal work.
 *
 * Handoff runs only when the user explicitly asks (e.g. "SESSION HANDOFF" in chat).
 * See `.cursor/rules/session-handoff.mdc` and `.cursor/skills/project-memory/SKILL.md`.
 *
 * Output: {} (no followup_message)
 */
process.stdout.write("{}");
process.exit(0);
