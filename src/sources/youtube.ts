import { XMLParser } from "fast-xml-parser";

export type Video = {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  published: Date;
  channelName: string;
};

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@" });

/** Fetch a YouTube playlist's RSS feed (newest ~15 items). */
export async function fetchPlaylistFeed(playlistId: string): Promise<Video[]> {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`);
  if (!res.ok) throw new Error(`YouTube feed ${playlistId}: HTTP ${res.status}`);
  const xml = parser.parse(await res.text());
  const entries = [xml.feed?.entry ?? []].flat();
  return entries.map((e: any) => ({
    id: e["yt:videoId"],
    title: String(e.title),
    url: `https://www.youtube.com/watch?v=${e["yt:videoId"]}`,
    thumbnail: `https://i.ytimg.com/vi/${e["yt:videoId"]}/hqdefault.jpg`,
    published: new Date(e.published),
    channelName: String(e.author?.name ?? ""),
  }));
}

/**
 * A channel's long-form uploads only. YouTube exposes per-channel playlists
 * keyed off the channel ID: UULF = long-form videos (no Shorts, no live).
 */
export function fetchLongFormUploads(channelId: string): Promise<Video[]> {
  return fetchPlaylistFeed(`UULF${channelId.slice(2)}`);
}
