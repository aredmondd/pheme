import type { Video } from "../sources/youtube.ts";
import { formatTimeEt } from "../dates.ts";

export function VideoCard({ video }: { video: Video }) {
  return (
    <a
      href={video.url}
      class="group flex border-2 border-black/20 border-dashed gap-3 p-2"
    >
      <div class="aspect-video w-36 shrink-0 overflow-hidden sm:w-44">
        <img src={video.thumbnail} alt="" loading="lazy" class="h-full w-full object-cover" />
      </div>
      <div class="flex flex-col grow justify-between">
        <p class="text-black/75 line-clamp-3 font-medium leading-snug group-hover:underline">
          {video.title}
        </p>
        <div class="font-mono flex justify-between items-end text-xs text-black/50">
          <p>{formatTimeEt(video.published)}</p>
          <p>@{video.channelName}</p>
        </div>
      </div>
    </a>
  );
}
