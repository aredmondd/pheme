# NBA Catchup

Daily NBA recap page — Chaz NBA + Chris PG-1 uploads since the last run, ESPN fantasy (matchup, roster, league leaders, standings), last night's final scores with highlight links, and a morning ntfy push. See [PLAN.md](PLAN.md) for scope and roadmap.

## Develop

```sh
npm install
npm run build      # fetch real data once (APIs + LLM), writes out/ and caches data/days/<date>.json
npm run dev        # styling loop at http://localhost:3000: renders from the cache, live reload, no API calls
npm run preview    # full build + plain static serve
npm run typecheck
```

`npm run build` is a preview: it uses the saved window (or the last 24h) and never advances it. `npm run daily` is what the timer runs; it records the run time so tomorrow's page picks up from there.

Styling: edit the TSX in `src/components/` or `src/styles.css` while `npm run dev` runs — the page re-renders from the cached recap and the browser reloads itself. Re-run `npm run build` when you want fresh data.

## Layout

| Path              | What                                                                   |
| ----------------- | ---------------------------------------------------------------------- |
| `src/config.ts`   | Channels, NBA highlight playlist ID (**update each season**), timezone |
| `src/sources/`    | YouTube Data API (`UULF…` long-form playlists = no Shorts) and ESPN    |
| `src/collect.ts`  | Gathers everything; each section succeeds or fails on its own          |
| `src/components/` | Page markup (Preact TSX → static HTML)                                 |
| `out/`            | Generated site: `index.html` = today, `YYYY-MM-DD/` = archive          |
| `data/`           | `state.json` (last run) and raw per-day JSON                           |

## Deploy (ThinkPad)

```sh
THINKPAD=user@thinkpad ./deploy.sh --setup   # first time: timer + tailscale serve
THINKPAD=user@thinkpad ./deploy.sh           # later code updates
```

Before `--setup`, create `.env` on the ThinkPad from `.env.example` (ntfy topic, site URL, Groq + YouTube API keys).

Runs via a systemd timer at 06:00 America/New_York (`Persistent=true` catches up after downtime). Logs: `journalctl -u nba-catchup`. Served privately on the tailnet with `tailscale serve`.
