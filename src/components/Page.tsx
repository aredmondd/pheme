import type { ComponentChildren } from "preact";
import type { Recap } from "../collect.ts";
import { etDateKey, formatDateKey, formatTimeEt } from "../dates.ts";
import { FantasySection } from "./FantasySection.tsx";
import { GameCard } from "./GameCard.tsx";
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
      <body class="min-h-screen bg-zinc-50 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <main class="mx-auto max-w-2xl px-4 pb-16 pt-8">
          <header class="mb-8">
            <p class="text-xs font-semibold uppercase tracking-widest text-orange-600 dark:text-orange-400">
              NBA Catchup
            </p>
            <h1 class="mt-1 text-3xl font-bold tracking-tight">
              {formatDateKey(todayKey, { weekday: "long", month: "long", day: "numeric" })}
            </h1>
            <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Videos since {formatTimeEt(recap.windowStart)} ET
            </p>
          </header>

          <Section title="Videos">
            <div class="space-y-6">
              {recap.channels.map(({ channel, videos }) => (
                <div key={channel.channelId}>
                  <h3 class="mb-2 flex items-baseline justify-between text-sm font-semibold">
                    <a href={`https://www.youtube.com/${channel.handle}`} class="hover:underline">
                      {channel.name}
                    </a>
                    {videos.ok && (
                      <span class="text-xs font-normal text-zinc-500">
                        {videos.data.length} new
                      </span>
                    )}
                  </h3>
                  {!videos.ok ? (
                    <Warning>Couldn't load {channel.name}: {videos.error}</Warning>
                  ) : videos.data.length === 0 ? (
                    <Empty>No new videos.</Empty>
                  ) : (
                    <div class="space-y-2">
                      {videos.data.map((v) => (
                        <VideoCard key={v.id} video={v} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>

          <Section
            title="Fantasy"
            subtitle={recap.fantasy.ok ? recap.fantasy.data.leagueName : undefined}
          >
            {recap.fantasy.ok ? (
              <FantasySection f={recap.fantasy.data} />
            ) : (
              <Warning>Couldn't load fantasy: {recap.fantasy.error}</Warning>
            )}
          </Section>

          <Section
            title="Final scores"
            subtitle={formatDateKey(recap.gamesDateKey, { weekday: "long", month: "short", day: "numeric" })}
          >
            {!games.ok ? (
              <Warning>Couldn't load scores: {games.error}</Warning>
            ) : games.data.length === 0 ? (
              <Empty>No games last night.</Empty>
            ) : (
              <div class="grid gap-2 sm:grid-cols-2">
                {games.data.map((g) => (
                  <GameCard key={g.id} game={g} />
                ))}
              </div>
            )}
          </Section>

          {archive.length > 0 && (
            <footer class="mt-12 border-t border-zinc-200 pt-6 dark:border-zinc-800">
              <h2 class="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
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
        </main>
      </body>
    </html>
  );
}

function Section(props: { title: string; subtitle?: string; children: ComponentChildren }) {
  return (
    <section class="mb-10">
      <h2 class="mb-3 flex items-baseline justify-between border-b border-zinc-200 pb-2 dark:border-zinc-800">
        <span class="text-lg font-bold">{props.title}</span>
        {props.subtitle && <span class="text-sm text-zinc-500">{props.subtitle}</span>}
      </h2>
      {props.children}
    </section>
  );
}

function Warning({ children }: { children: ComponentChildren }) {
  return (
    <p class="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
      ⚠️ {children}
    </p>
  );
}

function Empty({ children }: { children: ComponentChildren }) {
  return <p class="text-sm text-zinc-500">{children}</p>;
}
