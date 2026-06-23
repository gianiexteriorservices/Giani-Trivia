# Last Call Trivia

Hard **multiple-choice** trivia for two players — pass & steal, online or offline, installable on your phone, with **stats synced across both phones**. Built for Alex & Anthony.

## What it does
- **Multiple choice**, weighted toward hard/expert questions.
- **Online mode** pulls fresh questions from public trivia databases (The Trivia API + OpenTDB) so you rarely repeat. **Offline mode** uses 140 built-in questions. **Auto** switches based on your signal.
- **Pass & steal:** the active player taps an answer; miss it and the other player steals from the remaining options for half points. No clue? Pass for a clean steal. **No timer.**
- **Running scoreboard** every turn, plus **match modes**: open play, or **first to X points** (200 / 300 / 500 / custom) — the game ends and crowns a winner automatically when someone hits the target.
- **Stats:** wins/losses, win %, accuracy, best streak, best/worst categories, and head-to-head — synced across both phones via a tiny Netlify Function backed by Netlify Blobs (no third-party database, no API keys).

## Deploy to Netlify — pick one

### A) Netlify CLI — recommended (turns on synced stats)
```bash
npm i -g netlify-cli      # one-time
netlify login             # opens browser
netlify deploy --build --prod
```
On first run choose **“Create & configure a new site”**, pick your team, name it. Open the printed URL — questions and synced stats both work. Netlify installs the function dependency and provisions Blobs automatically.

### B) Connect a Git repo (auto-deploys on every change)
Push this folder to GitHub, then in Netlify: **Add new site → Import an existing project** → pick the repo. Build command: *none*. Publish directory: `.`

### C) Drag-and-drop (fastest — game + LOCAL stats only)
In Netlify, drag this whole folder onto the Sites page. The game works instantly with stats saved on each phone. Cross-phone **sync** needs the function, so use A or B for that.

## Sync stats across both phones
On each phone, open **Settings (gear) → Crew code** and set the **same** code (default `alex-anthony`). Your stats then merge across devices. It always works offline and syncs when back online.

## Install on your phone
Open the site in your phone’s browser → **Share / menu → Add to Home Screen**. It runs full-screen and works offline.

## Local development
```bash
npm install
netlify dev        # http://localhost:8888
```

## Files
| File | Purpose |
|------|---------|
| `index.html`, `styles.css` | App shell + styling |
| `questions.js` | 140 offline multiple-choice questions |
| `game.js` | Game logic + online question feed |
| `stats.js` | Stats model + sync client |
| `ui.js` | Rendering + interactions |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | PWA / offline support |
| `netlify/functions/stats.mjs` | Synced-stats backend (Netlify Blobs) |
| `netlify.toml`, `package.json` | Netlify config |
