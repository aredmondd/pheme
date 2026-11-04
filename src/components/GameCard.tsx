import type { GameWithHighlight } from "../collect.ts";
import type { TeamLine } from "../sources/espn.ts";

export function GameCard({ game }: { game: GameWithHighlight }) {
  const h = game.highlight;
  return (
    <div class="bg-black p-3">
      <div class="space-y-1.5">
        <TeamRow team={game.away} decided={game.completed} />
        <TeamRow team={game.home} decided={game.completed} />
      </div>
      <div class="mt-2 flex items-center justify-between border-t border-blue/33 pt-2 text-xs">
        <span class="font-medium text-silver/75">{game.status}</span>
        <a
          target="_blank"
          href={h.kind === "video" ? h.video.url : h.url}
          class="font-semibold text-green hover:underline"
        >
          Highlights
        </a>
      </div>
    </div>
  );
}

function TeamRow({ team, decided }: { team: TeamLine; decided: boolean }) {
  const muted = decided && !team.winner;
  return (
    <div class={`flex items-center gap-2 ${muted ? "text-silver/50" : ""}`}>
      <img src={team.logo} alt="" class="h-6 w-6" loading="lazy" />
      <span class={`flex-1 truncate text-sm ${team.winner ? "font-semibold" : ""}`}>
        {team.displayName}
        {team.record && (
          <span class="ml-1.5 text-xs font-normal text-silver/50">{team.record}</span>
        )}
      </span>
      <span class={`text-lg tabular-nums ${team.winner ? "font-bold" : ""}`}>
        {team.score ?? "–"}
      </span>
    </div>
  );
}
