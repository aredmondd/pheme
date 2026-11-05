# NBA Catchup — Plan

A daily NBA recap page: everything I read/watch about last night in one place, ready before I wake up.

## v1 (building now)

- **Runs**: systemd timer on the Debian ThinkPad (always on), **6:00am ET** (`OnCalendar=... America/New_York`, catches up after downtime).
- **Window**: everything published **since the last successful run** (not a strict rolling 24h).
- **Videos** (full uploads only — via the YouTube Data API on `UULF` long-form playlists, which exclude Shorts):
  - Chaz NBA — https://www.youtube.com/@ChazNBA
  - Chris PG-1 — https://www.youtube.com/@Chrispg1
  - Shown as thumbnail cards that open in YouTube.
- **Final scores**: ESPN public scoreboard JSON. Each game links to its official NBA highlight video (NBA "Nightly Full Game Highlights" playlist via the YouTube Data API — **ID changes each season**, set in `src/config.ts`; falls back to a YouTube search link).
- **Off nights**: page still publishes — "No games last night" + any videos.
- **Spoilers**: shown openly.
- **Stack**: TypeScript (Node 22, `tsx`), TSX components rendered with `preact-render-to-string` to static HTML, Tailwind v4 CLI. No framework, no server.
- **Hosting**: static files served via `tailscale serve` on the tailnet (private HTTPS). Phone needs Tailscale installed.
- **Archive**: `/` = today, `/YYYY-MM-DD/` = past days.
- **Failures**: publish a partial page with a warning on the failed section.
- **Deploy**: develop on Mac in this repo; `deploy.sh` rsyncs to the ThinkPad over Tailscale.

## v1.1 — fantasy + notifications (built)

- **ESPN fantasy** — league `634038353` ("Uncs n Blanco", public, H2H points), team **Red's Rockets**:
  - current week's matchup score vs opponent (no "days left" — ESPN doesn't expose matchup end dates cleanly)
  - each of my players' fantasy points last night (bench/IR flagged, "No game" vs "DNP"), top/worst starter
  - opponent's top 3 starters last night
  - injury status changes vs the previous day's saved data
  - league-wide top 5 performers last night (with which fantasy team owns them, or free agent)
  - other matchups this week + standings
- **Push notification** — ntfy (iPhone app), sent right after the daily build. Spoiler-free text (counts + fantasy margin); tapping opens `SITE_URL` (needs Tailscale connected on the phone — enable On Demand).

## v1.2 — AI briefing (built)

- "Last night in 30 seconds" card at the **top** of the page with two separate summaries:
  - **NBA** (5–8 bullets) from final scores + each team's top 3 scorers (ESPN box scores, one stat line per player).
  - **Your fantasy** (3–5 bullets) from the fantasy data (matchup, roster, opponent, league top 5, standings).
- Model: **Groq free tier**, `openai/gpt-oss-120b` (override with `GROQ_MODEL`). Key in `.env` as `GROQ_API_KEY`.
- Guardrails: prompts forbid invented stats/storylines; code drops any bullet whose numbers don't come from a data line about someone the bullet names (catches stats misattributed between players).
- Missing key / Groq down → "Summary unavailable"; rest of the page unaffected. Notification stays spoiler-free.

## Future ideas

- **Waiver suggestions** — best free agents from last night / trending.
- **Spoiler-free mode** — optional version that hides scores / video titles / the briefing behind tap-to-reveal, for watching highlights first. Notification text becomes a setting then.
- **Video transcript summaries** — fold Chaz / Chris PG-1 takes into the briefing.
