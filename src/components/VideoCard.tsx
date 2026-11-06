import type { Video } from "../sources/youtube.ts";
import { formatTimeEt } from "../util/dates.ts";

export function VideoCard({ video }: { video: Video }) {
  return (
    <a
      href={video.url}
      target="_blank"
      class="group flex flex-col gap-3 bg-black p-4 text-white sm:flex-row"
    >
      <div class="aspect-video shrink-0 overflow-hidden sm:w-44 md:w-24">
        <img src={video.thumbnail} alt="" loading="lazy" class="h-full w-full object-cover" />
      </div>
      <div class="flex grow flex-col justify-between gap-4">
        <p class="md:text-md line-clamp-2 text-sm leading-snug group-hover:underline md:line-clamp-3">
          {video.title}
        </p>
        <div class="flex items-end justify-between font-mono text-xs text-silver/50">
          <p>{formatTimeEt(video.published)}</p>
          <p>@{video.channelName}</p>
        </div>
      </div>
    </a>
  );
}
