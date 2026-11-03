# NBA Catchup — Plan

A daily NBA recap page: everything I read/watch about last night in one place, ready before I wake up.

## v1 (building now)

- **Runs**: systemd timer on the Debian ThinkPad (always on), **6:00am ET** (`OnCalendar=... America/New_York`, catches up after downtime).
- **Window**: everything published **since the last successful run** (not a strict rolling 24h).
- **Videos** (full uploads only — via YouTube's `UULF` long-form playlist feeds, which exclude Shorts):
  - Chaz NBA — https://www.youtube.com/@ChazNBA
  - Chris PG-1 — https://www.youtube.com/@Chrispg1
  - Shown as thumbnail cards that open in YouTube.
- **Final scores**: ESPN public scoreboard JSON. Each game links to its official NBA highlight video (NBA "Nightly Full Game Highlights" playlist RSS — **ID changes each season**, set in `src/config.ts`; falls back to a YouTube search link).
- **Off nights**: page still publishes — "No games last night" + any videos.
- **Spoilers**: shown openly.
- **Stack**: TypeScript (Node 22, `tsx`), TSX components rendered with `preact-render-to-string` to static HTML, Tailwind v4 CLI. No framework, no server.
- **Hosting**: static files served via `tailscale serve` on the tailnet (private HTTPS). Phone needs Tailscale installed.
- **Archive**: `/` = today, `/YYYY-MM-DD/` = past days.
- **Failures**: publish a partial page with a warning on the failed section.
- **Deploy**: develop on Mac in this repo; `deploy.sh` rsyncs to the ThinkPad over Tailscale.

## Future ideas

- **ESPN fantasy (v2)** — public league `634038353`, H2H points, team **Red's Rockets**:
  - current H2H matchup score vs opponent
  - each of my players' fantasy points from last night
  - top / worst performer
  - maybe: waiver pickups, injuries
- **AI overview** — short "what happened last night" (5–8 bullets) generated from box scores by **gpt-oss** via Ollama on another tailnet machine (reachable from the ThinkPad). Must degrade gracefully ("overview unavailable") if the model is offline. Later: optionally summarize video transcripts too.
- **Spoiler-free mode** — optional version that hides scores / video titles behind tap-to-reveal, for watching highlights first.
- **Push notification** — optional morning nudge linking to the page.
