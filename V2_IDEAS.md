# NBA Catchup — v2 Ideas

Brainstorm for what comes after v1.2. These are candidates to pick from, not commitments; see [PLAN.md](PLAN.md) for what's built. Rough effort tags: **S** = an evening, **M** = a weekend, **L** = a multi-weekend project.

## Where v1 stands

One static page per day, built at 6am ET on the ThinkPad and served over Tailscale:

- AI summary (NBA highlights, "around the league" from Chaz titles, fantasy), via Groq with a number-checking guardrail
- Chaz NBA + Chris PG-1 long-form uploads since the last run
- Final scores with NBA highlight links
- ESPN fantasy: matchup, roster, opponent top 3, injury changes, league top 5, other matchups, standings
- Day picker archive, ntfy push

The pipeline already does the hard part (collect → cache JSON per day → render). Most v2 ideas are new sections on top of `collect.ts`, or new ways of reading the per-day JSON in `data/days/`.

## Quick wins (S)

- **Tonight's slate**: a "Tonight" strip with tip-off times, TV/streaming network, and which of *my* fantasy players play tonight. ESPN's scoreboard already has this for the next date.
- **Games-remaining count for the fantasy week**: "You have 14 games left, opponent has 11." This is often the deciding stat in H2H points, and it's computable from the NBA schedule even though ESPN doesn't expose matchup end dates.
- **Close-game / OT badges** on game cards so the "worth watching the full highlights" games stand out.
- **Watch time**: show video length and a "≈ 38 min of video today" total so you know how much there is to catch up on.
- **Watched state**: tap a video card to mark it seen (localStorage), dimmed on later visits. Archive days show "3/5 watched".
- **Stale-config alarm**: the highlights playlist ID changes each season. Add a build warning and a line in the ntfy push when highlights fall back to search links for every game.
- **Per-section timing/health footer**: "ESPN 1.2s ✓ · YouTube ✓ · Groq ✗ (rate limited)" makes debugging partial pages faster.

## Bigger features

- **Spoiler-free mode (M)**: already in PLAN.md's future ideas. Scores, video titles, and the briefing sit behind tap-to-reveal, either per game or all at once. Could be a `?spoilers=off` query param plus a localStorage toggle, so it's a single static page with no second build.
- **Video transcript summaries (M)**: pull captions for Chaz / Chris PG-1 uploads and summarize each into 2–3 bullets ("what's this video actually about"). Fold the best takes into the LEAGUE briefing. Reuse the existing guardrail pattern: drop bullets with numbers not found in the transcript.
- **Standings + playoff picture (S–M)**: conference standings with the play-in line, plus "moved up/down" arrows vs yesterday from the saved day JSON.
- **Weekly recap page (M)**: a Sunday/Monday rollup at `/week/2026-W45/` covering the fantasy week result, top performers of the week, best games, and most-watched creators. All of it comes from the existing per-day JSON, so it needs no new APIs.
- **Player trend lines (M)**: small sparklines of my roster's last ~10 fantasy games, built by aggregating `data/days/*.json`. "Hot / cold" labels feed the fantasy briefing.
- **League storylines (L)**: an "On this night" or "season so far" card that tracks streaks (win streaks, 30-point games in a row) by diffing days. It's fun, but the guardrails have to grow to cover derived facts.
- **More creators, configurable (S)**: `CHANNELS` is already a list. Add a few more (e.g. a film-breakdown channel, a podcast clip channel) with per-channel options: max videos, keyword filters, "news" flag.
- **Search across the archive (M)**: a small client-side index (built at build time) so you can find "that Wemby game" from three weeks ago.

## Fantasy upgrades

- **Waiver wire suggestions**: already in PLAN.md's future ideas. Top free agents by fantasy points over the last 1/3/7 days, with games remaining this week. Highlight anyone who was in last night's league top 5.
- **Start/sit nudges for daily lineups**: if a starter has no game tonight and a bench player does, call it out ("Swap X → Y for tonight"). The data's already there.
- **Matchup projection**: a simple projection = my players' season avg fpts × games left vs the same for the opponent. Label it clearly as an estimate, and keep it out of the LLM prompt, or keep it in under strict wording.
- **Injury news linking**: when a roster player's status changes, surface any Chaz video whose title mentions them.
- **League activity feed**: trades, adds/drops by other managers since the last run (ESPN `mTransactions2` view).
- **Head-to-head history** vs this week's opponent.

## Personalization

- **Favorite team(s)**: pin their game to the top, always show their box score, and include a team line in the briefing even on quiet nights.
- **Followed players**: a small "Your guys" strip with last night's stat lines for players you care about outside fantasy.
- **Notification settings**: choose what the ntfy push contains (spoiler-free counts vs full fantasy margin vs favorite team result), and an optional second push before tip-off with lineup reminders.
- **Theme toggle**: light/dark (the site uses a strong blue/black palette, so a dark variant should be easy with Tailwind tokens).

## Technical / infra

- **Fixture-driven tests** for the summary guardrail and fantasy math (`src/fixtures.ts` already exists). Parsing ESPN's undocumented JSON is the most likely thing to break silently.
- **Schema versioning for `data/days/*.json`**: add a `version` field so trend/weekly features can read old days safely.
- **Retry + backoff** on YouTube/ESPN/Groq calls, and a "re-run just the failed sections" mode for mornings when one source flakes.
- **LLM fallback chain**: if Groq is down or rate-limited, try a second model/provider before showing "Summary unavailable".
- **Build output check**: a tiny smoke test after `daily` (page has N games, no empty sections on a game night) that pings ntfy on failure.
- **Image caching**: download YouTube thumbnails into `out/` so archive pages don't rot when URLs change.
- **PWA manifest + icon** so it installs cleanly on the iPhone home screen.

## Suggested roadmap

1. **v2.0 — "the morning page, sharper"**: Tonight's slate, games-remaining count, start/sit nudges, watched state, close-game badges. All small, all daily-use.
2. **v2.1 — spoiler-free mode** plus notification settings, since they're tightly linked.
3. **v2.2 — fantasy edge**: waiver suggestions, league activity feed, matchup projection.
4. **v2.3 — history**: schema versioning first, then player trend lines, the weekly recap page, and standings movement.
5. **Later**: transcript summaries, archive search, storylines.

## Open questions

- Is this only ever for me, or could league-mates use it? That decides whether personalization lives in config or in the UI.
- Spoiler-free: is that the default, or opt-in?
- Is the Groq free tier enough if transcript summaries add several more calls per day?
