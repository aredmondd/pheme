import type { Video } from "../sources/youtube.ts";
import { formatTimeEt } from "../dates.ts";

export function VideoCard({ video }: { video: Video }) {
  return (
    <a
      href={video.url}
      target="_blank"
      class="group flex flex-col gap-3 border-2 border-dashed border-black/10 p-2 sm:flex-row"
    >
      <div class="aspect-video shrink-0 overflow-hidden sm:w-44 md:w-24">
        <img src={video.thumbnail} alt="" loading="lazy" class="h-full w-full object-cover" />
      </div>
      <div class="flex grow flex-col justify-between gap-4">
        <p class="md:text-md line-clamp-2 text-sm leading-snug text-black/75 group-hover:underline md:line-clamp-3">
          {video.title}
        </p>
        <div class="flex items-end justify-between font-mono text-xs text-black/50">
          <p>{formatTimeEt(video.published)}</p>
          <p>@{video.channelName}</p>
        </div>
      </div>
    </a>
  );
}
