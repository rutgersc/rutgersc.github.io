import { fetchChannelVideos } from './video-utils.js';
import type { ChannelVideo } from './video-utils.js';
import { renderChannelVideoItem, SHORTS_MAX_SECONDS } from './ui.js';
import { groupByChannel, getWatchedVideosIndex } from './history.js';
import type { HistoryEntry, ChannelGroup } from './history.js';

const FEED_CHANNELS = 10;
const VIDEOS_PER_CHANNEL = 3;
const RECENCY_HALF_LIFE_DAYS = 30;
const LAST_SEEN_KEY = "feed-last-seen-at";
const IGNORED_KEY = "feed-ignored-channels";

export const channelKey = (g: Pick<ChannelGroup, "author" | "author_url">): string => g.author_url || g.author;

export function getIgnoredChannels(): ReadonlySet<string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(IGNORED_KEY) ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string") : []);
  } catch {
    return new Set();
  }
}

export function setChannelIgnored(key: string, ignored: boolean): void {
  const next = [...getIgnoredChannels()].filter(k => k !== key).concat(ignored ? [key] : []);
  localStorage.setItem(IGNORED_KEY, JSON.stringify(next));
}

interface FeedVideo extends ChannelVideo {
  channel: string;
  channelKey: string;
}

const pickFeedChannels = (history: HistoryEntry[], now: number): ChannelGroup[] => {
  const ignored = getIgnoredChannels();
  const allTime = groupByChannel(history, "count").filter(g => !ignored.has(channelKey(g)));

  const recencyScore = (group: ChannelGroup): number =>
    group.videos.reduce((sum, v) => {
      const ageDays = (now - new Date(v.dateViewed).getTime()) / 86_400_000;
      return sum + Math.pow(2, -Math.max(ageDays, 0) / RECENCY_HALF_LIFE_DAYS);
    }, 0);

  const recent = [...allTime].sort((a, b) => recencyScore(b) - recencyScore(a));

  const interleaved = allTime.flatMap((g, i) => (recent[i] ? [g, recent[i]] : [g]));
  return interleaved
    .filter((g, i) => (g.author_url || g.author_id) && interleaved.findIndex(o => channelKey(o) === channelKey(g)) === i)
    .slice(0, FEED_CHANNELS);
};

const isLongEnough = (v: ChannelVideo): boolean =>
  v.durationSeconds == null || v.durationSeconds > SHORTS_MAX_SECONDS;

export function renderFeed(history: HistoryEntry[]): HTMLDivElement {
  const section = document.createElement("div");
  section.style.cssText = "background:#1a1a1a;border-radius:8px;margin:12px auto;padding:16px;max-width:480px;box-shadow:0 2px 8px rgba(0,0,0,0.12);border:2px solid #4a5568;";

  const status = document.createElement("div");
  status.style.cssText = "color:#bbb;font-size:0.9rem;";
  status.textContent = "Loading feed...";
  section.appendChild(status);

  const channels = pickFeedChannels(history, Date.now());
  if (channels.length === 0) {
    status.textContent = "Watch some videos first — the feed follows the channels you watch.";
    return section;
  }

  const lastSeenAt = localStorage.getItem(LAST_SEEN_KEY) ?? "";

  Promise.all(channels.map(ch =>
    fetchChannelVideos(ch.author_url, ch.author_id, 50)
      .then(videos => videos
        .filter(isLongEnough)
        .slice(0, VIDEOS_PER_CHANNEL)
        .map((v): FeedVideo => ({ ...v, channel: ch.author, channelKey: channelKey(ch) })))
      .catch(e => { console.warn("feed: channel fetch failed", ch.author, e); return [] as FeedVideo[]; })
  )).then(perChannel => {
    const feed = perChannel.flat().sort((a, b) => (a.published > b.published ? -1 : 1));
    if (feed.length === 0) {
      status.textContent = "No recent videos found.";
      return;
    }
    status.remove();

    const watchedIndex = getWatchedVideosIndex();
    feed.map(video => {
      const item = renderChannelVideoItem(video, watchedIndex);
      item.dataset.channel = video.channelKey;
      const label = document.createElement("div");
      label.style.cssText = "display:flex;align-items:center;gap:6px;color:#8ecae6;font-size:0.75rem;font-weight:bold;margin-bottom:2px;";
      label.textContent = video.channel;
      const hideBtn = document.createElement("button");
      hideBtn.textContent = "🚫";
      hideBtn.title = `Hide ${video.channel} from feed`;
      hideBtn.style.cssText = "background:none;border:none;cursor:pointer;font-size:0.75rem;padding:0 2px;opacity:0.6;";
      hideBtn.onclick = () => {
        setChannelIgnored(video.channelKey, true);
        [...section.children]
          .filter((el): el is HTMLElement => el instanceof HTMLElement && el.dataset.channel === video.channelKey)
          .forEach(el => el.remove());
      };
      label.appendChild(hideBtn);
      item.prepend(label);
      if (watchedIndex.has(video.videoId)) item.style.opacity = "0.45";
      if (lastSeenAt && video.published > lastSeenAt) {
        item.style.borderLeft = "3px solid #ffd166";
        item.style.paddingLeft = "8px";
      }
      return item;
    }).forEach(item => section.appendChild(item));

    localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
  });

  return section;
}
