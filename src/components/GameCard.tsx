import type { GameWithHighlight } from "../collect.ts";
import type { TeamLine } from "../sources/espn.ts";

export function GameCard({ game }: { game: GameWithHighlight }) {
  const h = game.highlight;
  return (
    <a target="_blank" href={h.kind === "video" ? h.video.url : h.url} class="bg-black p-3">
      <div class="flex justify-between">
        <TeamRow team={game.away} decided={game.completed} />
        <hr class="my-4 h-auto w-px self-stretch border-0 bg-linear-to-b from-transparent via-blue to-transparent opacity-50" />
        <TeamRow team={game.home} decided={game.completed} />
      </div>
    </a>
  );
}

function TeamRow({ team, decided }: { team: TeamLine; decided: boolean }) {
  const muted = decided && !team.winner;
  return (
    <div class={`flex flex-col items-center p-2 ${muted ? "text-silver/50" : ""}`}>
      <img src={team.logo} alt="" class={`${muted ? "opacity-50" : ""} h-20 w-20`} loading="lazy" />
      <span class={`mt-2 text-lg tabular-nums ${team.winner ? "font-bold" : ""}`}>
        {team.score ?? "–"}
      </span>

      <span class={`truncate text-sm ${team.winner ? "font-semibold" : ""}`}>
        {team.record && <span class="text-xs font-normal text-silver/33">({team.record})</span>}
      </span>
    </div>
  );
}
