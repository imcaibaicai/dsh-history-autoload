# dsh-history-autoload

简体中文 | [English](README.en.md)

A browser-only DSH plugin that **loads the full earlier history of a session automatically when it opens**. Removable, no official file is modified.

## The problem it solves

Stock DSH loads only the last page of history (~50 messages) when a session opens; anything earlier needs a manual scroll up. This plugin pages backward on its own until the session reports "no more history".

**It also repairs turn-process folding**: the stock folding precondition includes `!historyIncomplete`, which is the paging flag `hasMore`. While history is incomplete the fold control never appears (short sessions can fold, long ones cannot); once this plugin drives `hasMore` to false, folding comes back naturally.

## Toggle

Settings → General → "Auto-load full history", on by default. Off restores stock behavior.

## Install

```bash
dsh plugin --profile web add -w dsh-history-autoload
```

Manual equivalent: place the package at `<DSH_HOME>/profiles/node_modules/dsh-history-autoload/` and add a row to `cordis.patch.yml`:

```yaml
- insert:
    - id: history-autoload
      name: 'dsh-history-autoload'
```

## Uninstall

Delete the insert row (the setting and the behavior disappear together). Browser-only: a hard refresh applies it; the host row is assembled at restart.

## Implementation notes

- Zero-render component seated on the official **session-level** slot `conversation.session.header.utilities` (renders once per session)
- Paging goes through the service face: `ctx.sessions.binding(sessionId).session.loadOlder()`
  (the session-level slot props do **not** carry `loadOlder` — the service is required)
- Ceiling of 200 pages; while `openState !== "open"` it waits at most 150 × 200ms
- All logic lives in `useEffect` under an overall try/catch (the conversation area has an ErrorBoundary: a render-phase throw degrades the whole block and does not self-heal)
- Depends only on official session service APIs (`loadOlder` / `hasMore` / `openState`) and **touches no DOM selector** — the most upgrade-robust shape a client plugin can take

## Compatibility

- DeepSeek Harness `0.1.5-rc.1` (web profile, browser side)
- Client-side `require` limited to `react` / `react/jsx-runtime` (platform baseline table)

## License

MIT
