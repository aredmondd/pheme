/**
 * YouTube Data API v3. The public RSS feeds (feeds/videos.xml) started 404ing
 * in 2026, so this uses the official API instead. Env: YOUTUBE_API_KEY.
 *
 * playlistItems.list costs 1 quota unit per call (free quota: 10,000/day), so a
 * daily run uses a handful of units. Avoid search.list — it costs 100.
 */
export type Video = {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  published: Date;
  channelName: string;
};

type PlaylistItem = {
  snippet?: { title?: string; videoOwnerChannelTitle?: string };
  contentDetails?: { videoId?: string; videoPublishedAt?: string };
};

/** A playlist's first 50 items (uploads playlists are newest-first). */
export async function fetchPlaylistVideos(playlistId: string): Promise<Video[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY not set");

  const params = new URLSearchParams({
    part: "snippet,contentDetails",
    playlistId,
    maxResults: "50",
    key,
  });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(
      `YouTube playlist ${playlistId}: HTTP ${res.status} ${body?.error?.message ?? ""}`.trim(),
    );
  }
  const { items = [] } = (await res.json()) as { items?: PlaylistItem[] };

  return items.flatMap((item) => {
    const id = item.contentDetails?.videoId;
    const published = item.contentDetails?.videoPublishedAt;
    // Private/deleted videos have no publish date — skip them.
    if (!id || !published) return [];
    return [
      {
        id,
        title: item.snippet?.title ?? "",
        url: `https://www.youtube.com/watch?v=${id}`,
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        published: new Date(published),
        channelName: item.snippet?.videoOwnerChannelTitle ?? "",
      },
    ];
  });
}

/**
 * A channel's long-form uploads only. YouTube exposes per-channel playlists
 * keyed off the channel ID: UULF = long-form videos (no Shorts, no live).
 */
export function fetchLongFormUploads(channelId: string): Promise<Video[]> {
  return fetchPlaylistVideos(`UULF${channelId.slice(2)}`);
}
