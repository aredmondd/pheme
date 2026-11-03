import type { Video } from "../sources/youtube.ts";
import { formatTimeEt } from "../dates.ts";

export function VideoCard({ video }: { video: Video }) {
  return (
    <a
      href={video.url}
      class="group flex gap-3 rounded-xl bg-white p-2 shadow-sm ring-1 ring-zinc-200 transition hover:ring-zinc-300 dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:ring-zinc-700"
    >
      <div class="aspect-video w-36 shrink-0 overflow-hidden rounded-lg bg-zinc-200 sm:w-44 dark:bg-zinc-800">
        <img src={video.thumbnail} alt="" loading="lazy" class="h-full w-full object-cover" />
      </div>
      <div class="min-w-0 py-0.5">
        <p class="line-clamp-3 text-sm font-medium leading-snug group-hover:underline">
          {video.title}
        </p>
        <p class="mt-1 text-xs text-zinc-500">{formatTimeEt(video.published)}</p>
      </div>
    </a>
  );
}
