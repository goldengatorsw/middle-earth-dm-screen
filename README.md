# Wanderings In Middle Earth — DM Session Screen

A focused, single-session DM tool for live session use during "Session 19 — The Tower in the Stone."

🌐 **Live site:** https://goldengatorsw.github.io/middle-earth-dm-screen/

🔒 **Private notice:** This site is public on GitHub Pages but unlisted (`noindex` meta). Don't share the URL with players. It contains DM-only secrets including hidden NPC motives, ticking clocks, and Pharazôr's true plans.

---

## What it has

Six tabs, designed for active session use:

- **Overview** — session snapshot, runtime, the three cliffhangers
- **Scenes** — vertical scene navigator, click any of the 10 scene entries to open. Tracks completion. Each scene shows: read-aloud-style scenery, DM notes, skill check tables, NPC dialogue seeds (where relevant), branch IF/THEN logic.
- **NPCs** — 5 NPC roster with surface read always visible, hidden motive + stats behind a "Reveal DM-only" button (so you don't spoil yourself by accident)
- **Skills** — every skill check table in the session, filterable by skill name, sorted by scene
- **Scenery** — all read-aloud-style passages in one place for quick reference
- **Tracker** — hidden conditions, ticking clocks, foreshadowing checklist (5 items), must-be-true list, can-happen list, full session wrap checklist (16 items)

State is saved to `localStorage` — your scene completion and checklist progress persist across reloads on the same browser.

---

## Tech

- React 18 + Vite (built and deployed via GitHub Actions)
- Single source of truth: `src/session-data.json`
- No backend, no API calls, no external dependencies
- Hosted on GitHub Pages
- Mobile-friendly (use it on your phone or tablet at the table)

---

## Local development

```bash
npm install
npm run dev      # Local server at http://localhost:5173
npm run build    # Outputs to dist/ — what GitHub Pages deploys
```

---

## Updating for future sessions

This DM screen is built specifically for Session 19. Two paths going forward:

**Option A — Reuse for Session 20+ (recommended):**
After Session 19, the data file (`src/session-data.json`) gets replaced with Session 20's plan. Same UI, new content. Each session = one JSON replacement. (The same per-session-update pattern as the player wiki.)

**Option B — Build a session-picker:**
If you want past sessions accessible too, a future enhancement would add a session-picker dropdown to the top nav. Not built yet — would need a small refactor.

---

## License

Personal campaign content. Not for redistribution.
