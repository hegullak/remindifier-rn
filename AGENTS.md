# Agent instructions

## Expo

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any Expo-related code.

## Project memory

**Every session — read both:**

1. [`claude-current-remindifier-state.md`](./claude-current-remindifier-state.md) — current status, agreements, recent work
2. [`PROJECT_MEMORY.md`](./PROJECT_MEMORY.md) — architecture, navigation, i18n, pitfalls

**Every session — update at end:**

- `claude-current-remindifier-state.md` if anything meaningful changed
- `PROJECT_MEMORY.md` only when conventions or structure change

Cursor hooks: `sessionStart` injects memory · `stop` does **not** auto-handoff
Cursor rules: `.cursor/rules/session-handoff.mdc` (apply only when user requests SESSION HANDOFF) · Skill: `.cursor/skills/project-memory/SKILL.md`

**Note:** Hooks run from the project root. Open `remindifier-rn` as the Cursor workspace (not the web repo) for session-start memory injection.
