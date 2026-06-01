---
name: project-memory
description: >-
  Read or update remindifier project memory. Use at session start, session end,
  when the user asks to save context for restart, or when agreements/status
  should be persisted. Updates claude-current-remindifier-state.md and
  PROJECT_MEMORY.md — never ad-hoc context files.
---

# remindifier project memory

## Which file?

- **`claude-current-remindifier-state.md`** — session snapshot (update often)
- **`PROJECT_MEMORY.md`** — stable architecture (update rarely)

## Session start checklist

1. Read both files
2. `git pull --rebase origin sandbox`
3. Note uncommitted changes and latest commit in state file if stale

## Session end checklist

**Only when the user explicitly requests handoff** (e.g. "SESSION HANDOFF"). Do not hand off after every task or turn.

The `stop` hook does **not** auto-submit handoff (it fires after each agent turn).

1. Open `claude-current-remindifier-state.md`
2. Update: `Last updated`, `Latest commit`, `Recent commits`, `What Was Done`, `Uncommitted local changes`, `User Preferences`
3. If routes/schema/i18n conventions changed → update `PROJECT_MEMORY.md`
4. Commit when the user asked to commit; push only when the user asked to push

## State file sections to keep current

```markdown
## Repository          → branch, latest commit
## Uncommitted local changes
## Recent commits
## What Was Done (recent sessions)
## User Preferences
## Open GitHub Issues / next work
```

## User Preferences (record verbatim)

Examples already agreed:
- Pull before each task; push after each task
- Session context → `claude-current-remindifier-state.md` (not Gemini prompts, not random files)
- Icons over text for actions (✎, 🗑, ✦)
- Norwegian bryllupsdager — traditional names
- `logger` not `console.log`
- Always lowercase **remindifier**

## Do NOT

- Create `AI_PROJECT_CONTEXT.md` or similar without explicit user request
- Store session agreements only in chat (they will be lost)
- Commit `.env`, `coverage/`, `expo-output.log`
