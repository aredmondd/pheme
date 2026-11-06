import type { Recap } from "../collect.ts";
import { etDateKey, formatDateKey, formatTimeEt } from "../dates.ts";
import { Briefing } from "./Briefing.tsx";
import { DayPicker, type DayLink } from "./DayPicker.tsx";
import { FantasySection } from "./FantasySection.tsx";
import { GameCard } from "./GameCard.tsx";
import { StandingsSection } from "./StandingsSection.tsx";
import { Warning } from "./Notice.tsx";
import { VideoCard } from "./VideoCard.tsx";

type Props = { recap: Recap; days: DayLink[] };

export function Page({ recap, days }: Props) {
  const todayKey = etDateKey(recap.generatedAt);
  const games = recap.games;

  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <title>{`NBA Catchup · ${formatDateKey(todayKey, { month: "short", day: "numeric" })}`}</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body class="min-h-screen bg-silver font-normal selection:bg-red/33 selection:text-red">
        <main class="mx-auto max-w-3xl px-4 pt-8 pb-16">
          <header class="mb-8">
            <h1 class="font-display text-6xl font-bold tracking-tight text-green">
              {formatDateKey(todayKey, { weekday: "long", month: "long", day: "numeric" })}
            </h1>
            <p class="text-xs text-black opacity-50">Generated {formatTimeEt(recap.generatedAt)}</p>
          </header>

          <Briefing briefing={recap.briefing} />

          <h2 class="bg-green p-2 text-center font-mono text-2xl text-black">VIDEOS</h2>
          <div class="mb-8 flex flex-col border-4 border-green">
            {[...recap.channels]
              .sort(
                (a, b) =>
                  Number(b.channel.handle === "@Chrispg1") -
                  Number(a.channel.handle === "@Chrispg1"),
              )
              .flatMap(({ channel, videos }) =>
                videos.ok
                  ? videos.data.map((v) => <VideoCard key={v.id} video={v} />)
                  : [
                      <Warning key={channel.name}>
                        {channel.name}: {videos.error}
                      </Warning>,
                    ],
              )}
          </div>

          <h2 class="bg-red p-2 text-center font-mono text-2xl text-black">FANTASY</h2>
          <div class="mb-8 border-4 border-red">
            {recap.fantasy.ok ? (
              <FantasySection f={recap.fantasy.data} />
            ) : (
              <Warning>{recap.fantasy.error}</Warning>
            )}
          </div>

          <h2 class="bg-blue p-2 text-center font-mono text-2xl text-black">SCOREBOARD</h2>
          <div class="mb-8 border-4 border-blue sm:p-2">
            {!games.ok ? (
              <Warning>{games.error}</Warning>
            ) : games.data.length === 0 ? (
              <p class="text-black">No games last night.</p>
            ) : (
              <div class="grid sm:grid-cols-2 sm:gap-2">
                {games.data.map((g) => (
                  <GameCard key={g.id} game={g} />
                ))}
              </div>
            )}
          </div>

          {recap.standings && (
            <>
              <h2 class="bg-red p-2 text-center font-mono text-2xl text-black">STANDINGS</h2>
              {recap.standings.ok ? (
                <StandingsSection s={recap.standings.data} />
              ) : (
                <Warning>{recap.standings.error}</Warning>
              )}
            </>
          )}

          <DayPicker days={days} current={todayKey} />

          <p class="mt-12 text-center font-display text-5xl text-green">aiden redmond</p>
          <img src="/images/hello.png" alt="Hello my name is sticker" class="mx-auto mt-4 w-48" />
          <p class="text-center font-display text-5xl text-green">made this website</p>
        </main>
      </body>
    </html>
  );
}
