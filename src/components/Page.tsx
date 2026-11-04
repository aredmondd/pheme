import type { ComponentChildren } from "preact";
import type { Recap } from "../collect.ts";
import { etDateKey, formatDateKey, formatTimeEt } from "../dates.ts";
import { Briefing } from "./Briefing.tsx";
import { FantasySection } from "./FantasySection.tsx";
import { GameCard } from "./GameCard.tsx";
import { Empty, Warning } from "./Notice.tsx";
import { VideoCard } from "./VideoCard.tsx";

type Props = { recap: Recap; archive: string[] };

export function Page({ recap, archive }: Props) {
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
        <main class="mx-auto max-w-2xl px-4 pt-8 pb-16">
          <header class="mb-8">
            <h1 class="font-display text-6xl font-bold tracking-tight text-green">
              {formatDateKey(todayKey, { weekday: "long", month: "long", day: "numeric" })}
            </h1>
            <p class="text-xs text-black opacity-50">Generated {formatTimeEt(recap.generatedAt)}</p>
          </header>

          <Briefing briefing={recap.briefing} />

          <h2 class="bg-green p-2 text-center font-mono text-2xl text-black">VIDEOS</h2>
          <div class="mb-8 flex flex-col gap-4 border-4 border-green p-4">
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
          <div class="border-4 border-blue p-4">
            {!games.ok ? (
              <Warning>{games.error}</Warning>
            ) : games.data.length === 0 ? (
              <Empty>No games last night.</Empty>
            ) : (
              <div class="grid gap-2 sm:grid-cols-2">
                {games.data.map((g) => (
                  <GameCard key={g.id} game={g} />
                ))}
              </div>
            )}
          </div>

          {archive.length > 0 && (
            <footer class="mt-12 border-t border-zinc-200 pt-6 dark:border-zinc-800">
              <h2 class="mb-2 text-xs font-semibold tracking-widest text-zinc-500 uppercase">
                Past days
              </h2>
              <ul class="flex flex-wrap gap-2 text-sm">
                {archive.map((key) => (
                  <li key={key}>
                    <a
                      href={`/${key}/`}
                      class="rounded-md bg-zinc-200/60 px-2 py-1 hover:bg-zinc-200 dark:bg-zinc-800/60 dark:hover:bg-zinc-800"
                    >
                      {formatDateKey(key, { weekday: "short", month: "short", day: "numeric" })}
                    </a>
                  </li>
                ))}
              </ul>
            </footer>
          )}

          <p class="mt-12 text-center font-display text-5xl text-green">
            designed by aiden redmond
          </p>
        </main>
      </body>
    </html>
  );
}
