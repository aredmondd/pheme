import type { GameWithHighlight } from "../collect.ts";
import type { TeamLine } from "../sources/espn.ts";

export function GameCard({ game }: { game: GameWithHighlight }) {
  const h = game.highlight;
  return (
    <div class="rounded-xl bg-white p-3 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
      <div class="space-y-1.5">
        <TeamRow team={game.away} decided={game.completed} />
        <TeamRow team={game.home} decided={game.completed} />
      </div>
      <div class="mt-2 flex items-center justify-between border-t border-zinc-100 pt-2 text-xs dark:border-zinc-800">
        <span class="font-medium text-zinc-500">{game.status}</span>
        {h.kind === "video" ? (
          <a
            href={h.video.url}
            class="font-semibold text-orange-600 hover:underline dark:text-orange-400"
          >
            ▶ Highlights
          </a>
        ) : (
          <a href={h.url} class="text-zinc-500 hover:underline">
            Search highlights
          </a>
        )}
      </div>
    </div>
  );
}

function TeamRow({ team, decided }: { team: TeamLine; decided: boolean }) {
  const muted = decided && !team.winner;
  return (
    <div class={`flex items-center gap-2 ${muted ? "text-zinc-400 dark:text-zinc-500" : ""}`}>
      <img src={team.logo} alt="" class="h-6 w-6" loading="lazy" />
      <span class={`flex-1 truncate text-sm ${team.winner ? "font-semibold" : ""}`}>
        {team.displayName}
        {team.record && <span class="ml-1.5 text-xs font-normal text-zinc-400">{team.record}</span>}
      </span>
      <span class={`text-lg tabular-nums ${team.winner ? "font-bold" : ""}`}>
        {team.score ?? "–"}
      </span>
    </div>
  );
}
