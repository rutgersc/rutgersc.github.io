import { renderVideoItem, renderXItem, renderChannelGroups } from './ui.js';
import { scheduleSyncToTodo, syncHistoryNow, isHistorySyncReady } from './history-sync.js';
import { resolveChannelDetails } from './video-utils.js';
import type { VideoData, VideoProgress } from './video-utils.js';

export interface YouTubeHistoryEntry {
  kind: 'youtube';
  videoData: VideoData;
  dateViewed: string;
  wasWatchLater?: boolean;
  progress?: VideoProgress;
}

export interface XHistoryEntry {
  kind: 'x';
  postId: string;
  dateViewed: string;
  wasWatchLater?: boolean;
}

export type HistoryEntry = YouTubeHistoryEntry | XHistoryEntry;

export const historyKey = (entry: HistoryEntry): string =>
  entry.kind === 'x' ? `x:${entry.postId}` : `youtube:${entry.videoData.video_id}`;

export interface ChannelGroup {
  author: string;
  author_url?: string;
  author_id?: string;
  videos: Array<{
    videoData: VideoData;
    dateViewed: string;
    wasWatchLater?: boolean;
  }>;
}

export interface CompactedHistory {
  compactedAt: string;
  channels: ChannelGroup[];
}

export function parseHistoryEntry(value: unknown): HistoryEntry | null {
  if (!value || typeof value !== 'object') return null;
  const entry = value as Record<string, unknown>;
  if (entry.kind === 'x') {
    return typeof entry.postId === 'string' && /^\d+$/.test(entry.postId) && typeof entry.dateViewed === 'string'
      ? { kind: 'x', postId: entry.postId, dateViewed: entry.dateViewed, wasWatchLater: entry.wasWatchLater === true }
      : null;
  }
  if (entry.kind !== undefined && entry.kind !== 'youtube') return null;
  if (!entry.videoData || typeof entry.videoData !== 'object') return null;
  const videoData = entry.videoData as Record<string, unknown>;
  if (typeof videoData.video_id !== 'string') return null;
  const dateViewed = typeof entry.dateViewed === 'string' ? entry.dateViewed
    : typeof entry.timestamp === 'string' ? entry.timestamp : new Date().toISOString();
  const progress = entry.progress && typeof entry.progress === 'object' ? entry.progress as VideoProgress : null;
  return {
    kind: 'youtube',
    videoData: {
      ...videoData,
      title: typeof videoData.title === 'string' ? videoData.title : '',
      author: typeof videoData.author === 'string' ? videoData.author : ''
    } as VideoData,
    dateViewed,
    wasWatchLater: entry.wasWatchLater === true,
    ...(progress ? { progress } : {})
  };
}

export function getHistory(): HistoryEntry[] {
  const stored = JSON.parse(localStorage.getItem('history') || '[]') as unknown;
  if (!Array.isArray(stored)) return [];
  const history = stored.map(parseHistoryEntry).filter((entry): entry is HistoryEntry => entry !== null);
  if (stored.some(entry => entry?.timestamp && !entry?.dateViewed)) {
    localStorage.setItem('history', JSON.stringify(history));
  }
  return history;
}

export function addToHistory(videoData: VideoData, _name: string, wasWatchLater: boolean = false, progress: VideoProgress | null = null): void {
  const history = getHistory();

  const existingEntry = history.find(
    (item) => item.kind === 'youtube' && item.videoData.video_id === videoData.video_id
  );
  const preservedWasWatchLater = (existingEntry?.wasWatchLater === true) || wasWatchLater;

  const filteredHistory = history
    .filter((item) => item.kind !== 'youtube' || item.videoData.video_id !== videoData.video_id);

  const dateViewed = new Date().toISOString();
  const entry: HistoryEntry = {
    kind: 'youtube',
    videoData,
    dateViewed,
    wasWatchLater: preservedWasWatchLater
  };

  if (progress && progress.currentTime !== undefined && progress.duration !== undefined) {
    entry.progress = {
      currentTime: progress.currentTime,
      duration: progress.duration,
      percentage: progress.duration > 0 ? (progress.currentTime / progress.duration) * 100 : 0
    };
  }

  filteredHistory.unshift(entry);
  localStorage.setItem("history", JSON.stringify(filteredHistory));

  console.log(history);

  renderHistory();

  if (isHistorySyncReady()) {
    syncHistoryNow();
  }
}

export function addXToHistory(postId: string, wasWatchLater = false): void {
  const history = getHistory();
  const previous = history.find(entry => entry.kind === 'x' && entry.postId === postId);
  const entry: XHistoryEntry = {
    kind: 'x',
    postId,
    dateViewed: new Date().toISOString(),
    wasWatchLater: wasWatchLater || previous?.wasWatchLater === true
  };
  localStorage.setItem('history', JSON.stringify([entry, ...history.filter(item => historyKey(item) !== historyKey(entry))]));
  renderHistory();
  if (isHistorySyncReady()) syncHistoryNow();
}

export function updateHistoryProgress(videoId: string, currentTime: number, duration: number): void {
  const history = getHistory();
  const entry = history.find((item): item is YouTubeHistoryEntry => item.kind === 'youtube' && item.videoData.video_id === videoId);

  if (entry && duration > 0) {
    entry.progress = {
      currentTime,
      duration,
      percentage: (currentTime / duration) * 100
    };
    localStorage.setItem("history", JSON.stringify(history));

    if (isHistorySyncReady()) {
      scheduleSyncToTodo();
    }
  }
}

export function getHistoryProgress(videoId: string): number {
  const entry = getHistory().find((item): item is YouTubeHistoryEntry => item.kind === 'youtube' && item.videoData.video_id === videoId);
  return entry?.progress?.currentTime ?? 0;
}

export type HistoryView = "list" | "grouped";

export function getHistoryView(): HistoryView {
  return localStorage.getItem("history-view") === "grouped" ? "grouped" : "list";
}

function setHistoryView(view: HistoryView): void {
  localStorage.setItem("history-view", view);
  renderHistory();
}

export type GroupSort = "count" | "recent";

export function getGroupSort(): GroupSort {
  return localStorage.getItem("history-group-sort") === "recent" ? "recent" : "count";
}

function setGroupSort(sort: GroupSort): void {
  localStorage.setItem("history-group-sort", sort);
  renderHistory();
}

export function groupByChannel(history: HistoryEntry[], sort: GroupSort = "count"): ChannelGroup[] {
  const groups = history.filter((entry): entry is YouTubeHistoryEntry => entry.kind === 'youtube').reduce((acc, entry) => {
    const vd = entry.videoData;
    const key = vd.author_url || vd.author || vd.video_id;
    const group = acc[key] ?? (acc[key] = { author: vd.author, author_url: vd.author_url, videos: [] });
    group.videos.push({ videoData: vd, dateViewed: entry.dateViewed, wasWatchLater: entry.wasWatchLater });
    return acc;
  }, {} as Record<string, ChannelGroup>);

  const grouped = Object.values(groups)
    .map(group => ({ ...group, videos: [...group.videos].sort((a, b) => (a.dateViewed > b.dateViewed ? -1 : 1)) }));

  return sort === "recent"
    ? grouped.sort((a, b) => (a.videos[0].dateViewed > b.videos[0].dateViewed ? -1 : 1))
    : grouped.sort((a, b) => b.videos.length - a.videos.length);
}

const HISTORY_WARN_THRESHOLD = 250;
const FLAT_PAGE_SIZE = 100;
let flatRenderLimit = FLAT_PAGE_SIZE;

export function renderHistory(): void {
  const history_list = document.getElementById("history_list");
  if (!history_list) return;

  history_list.innerHTML = "";
  const history = getHistory();
  const view = getHistoryView();

  const renderHistoryControls = (): HTMLDivElement => {
    const bar = document.createElement("div");
    bar.style.cssText = "display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap;margin:0 auto 12px auto;max-width:480px;";

    const makePill = (label: string, active: boolean, onClick: () => void): HTMLButtonElement => {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.style.cssText = `background:${active ? "#2d6a4f" : "#232323"};color:${active ? "#fff" : "#8ecae6"};border:1px solid #333;border-radius:6px;padding:6px 14px;cursor:pointer;font-weight:bold;`;
      btn.onclick = onClick;
      return btn;
    };

    const count = document.createElement("span");
    count.textContent = `${history.length} event${history.length !== 1 ? "s" : ""}`;
    count.style.cssText = "color:#bbb;font-size:0.9rem;margin-right:4px;";
    bar.appendChild(count);

    bar.appendChild(makePill("List", view === "list", () => setHistoryView("list")));
    bar.appendChild(makePill("By channel", view === "grouped", () => setHistoryView("grouped")));

    if (view === "grouped") {
      const sort = getGroupSort();
      const sortLabel = document.createElement("span");
      sortLabel.textContent = "sort:";
      sortLabel.style.cssText = "color:#888;font-size:0.85rem;margin-left:4px;";
      bar.appendChild(sortLabel);
      bar.appendChild(makePill("count", sort === "count", () => setGroupSort("count")));
      bar.appendChild(makePill("recent", sort === "recent", () => setGroupSort("recent")));
    }

    const compacted = getCompactedHistory();
    if (compacted) {
      const count = compacted.channels.reduce((n, ch) => n + ch.videos.length, 0);
      const importBtn = document.createElement("button");
      importBtn.textContent = `⬆ Import compacted (${count})`;
      importBtn.title = "One-time: merge old compacted history back into the log";
      importBtn.style.cssText = "background:#4a5568;color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;";
      importBtn.onclick = () => importCompactedIntoHistory();
      bar.appendChild(importBtn);
    }

    return bar;
  };

  history_list.appendChild(renderHistoryControls());

  if (history.length >= HISTORY_WARN_THRESHOLD) {
    const warn = document.createElement("div");
    warn.textContent = `⚠ ${history.length} events stored — history is getting large; consider clearing old entries.`;
    warn.style.cssText = "color:#ffd166;background:#2a2410;border:1px solid #5a4a1a;border-radius:6px;padding:8px 14px;margin:0 auto 12px auto;max-width:480px;text-align:center;font-size:0.9rem;";
    history_list.appendChild(warn);
  }

  if (view === "grouped") {
    history.filter((entry): entry is XHistoryEntry => entry.kind === 'x').forEach(entry => {
      history_list.appendChild(renderXItem(entry.postId, entry.dateViewed, () => removeEntry(historyKey(entry))));
    });
    history_list.appendChild(renderChannelGroups(groupByChannel(history, getGroupSort())));
    return;
  }

  function removeEntry(key: string): void {
    const filtered = getHistory().filter(item => historyKey(item) !== key);
    localStorage.setItem("history", JSON.stringify(filtered));
    renderHistory();
    if (isHistorySyncReady()) syncHistoryNow();
  }

  const fixEntry = async (videoId: string): Promise<void> => {
    const details = await resolveChannelDetails(videoId);
    const current = getHistory();
    const entry = current.find(item => item.kind === 'youtube' && item.videoData.video_id === videoId);
    if (!entry || entry.kind !== 'youtube') return;
    entry.videoData = {
      ...entry.videoData,
      title: entry.videoData.title || details.title || "",
      author: entry.videoData.author || details.author || "",
      ...(details.author_url ? { author_url: details.author_url } : {})
    };
    localStorage.setItem("history", JSON.stringify(current));
    renderHistory();
    if (isHistorySyncReady()) syncHistoryNow();
  };

  history.slice(0, flatRenderLimit).forEach(entry => {
    if (entry.kind === 'x') {
      history_list.appendChild(renderXItem(entry.postId, entry.dateViewed, () => removeEntry(historyKey(entry))));
    } else {
      history_list.appendChild(renderVideoItem(entry.videoData, entry.dateViewed, {
        onRemove: () => removeEntry(historyKey(entry)),
        onFix: () => fixEntry(entry.videoData.video_id),
        wasWatchLater: entry.wasWatchLater || false,
        progress: entry.progress || null
      }));
    }
  });

  if (history.length > flatRenderLimit) {
    const moreBtn = document.createElement("button");
    moreBtn.textContent = `Show more (${history.length - flatRenderLimit} older)`;
    moreBtn.style.cssText = "display:block;width:100%;max-width:480px;margin:12px auto;padding:10px;background:#232323;color:#8ecae6;border:1px solid #333;border-radius:8px;font-weight:bold;cursor:pointer;";
    moreBtn.onclick = () => { flatRenderLimit += FLAT_PAGE_SIZE; renderHistory(); };
    history_list.appendChild(moreBtn);
  }
}

export function clearHistory(): void {
  console.log("clearHistory");
  localStorage.removeItem("history");
  localStorage.removeItem("compactedHistory");
  renderHistory();

  if (isHistorySyncReady()) {
    syncHistoryNow();
  }
}

export function getWatchedVideosIndex(): Map<string, { dateViewed: string }> {
  const index = new Map<string, { dateViewed: string }>();

  const compacted = getCompactedHistory();
  (compacted?.channels ?? []).flatMap(ch => ch.videos).forEach(v => {
    index.set(v.videoData.video_id, { dateViewed: v.dateViewed });
  });

  getHistory().filter((entry): entry is YouTubeHistoryEntry => entry.kind === 'youtube').forEach(entry => {
    const existing = index.get(entry.videoData.video_id);
    if (!existing || entry.dateViewed > existing.dateViewed) {
      index.set(entry.videoData.video_id, { dateViewed: entry.dateViewed });
    }
  });

  return index;
}

export function getCompactedHistory(): CompactedHistory | null {
  return JSON.parse(localStorage.getItem("compactedHistory") || "null") as CompactedHistory | null;
}

export function importCompactedIntoHistory(): void {
  const compacted = getCompactedHistory();
  if (!compacted) return;

  const imported: HistoryEntry[] = compacted.channels.flatMap(ch =>
    ch.videos.map(v => ({ kind: 'youtube' as const, videoData: v.videoData, dateViewed: v.dateViewed, wasWatchLater: v.wasWatchLater ?? false }))
  );

  const byId = [...getHistory(), ...imported].reduce((acc, entry) => {
    const key = historyKey(entry);
    const prev = acc[key];
    if (!prev || entry.dateViewed > prev.dateViewed) acc[key] = entry;
    return acc;
  }, {} as Record<string, HistoryEntry>);

  const merged = Object.values(byId).sort((a, b) => (a.dateViewed > b.dateViewed ? -1 : 1));

  localStorage.setItem("history", JSON.stringify(merged));
  localStorage.removeItem("compactedHistory");
  renderHistory();

  if (isHistorySyncReady()) syncHistoryNow();
}

export function dumpAllEvents(): void {
  const history = getHistory();
  const compacted = getCompactedHistory();

  console.log("=== ALL EVENTS DUMP ===");
  console.log("Current History:", history);
  console.log("Compacted History:", compacted);

  let output = "=== CURRENT HISTORY ===\n\n";
  history.forEach((event, index) => {
    output += event.kind === 'x'
      ? `[${index}] X post ${event.postId}\n`
      : `[${index}] ${event.videoData.author} - ${event.videoData.title}\n    Video ID: ${event.videoData.video_id}\n`;
    output += `    Viewed: ${event.dateViewed}\n\n`;
  });

  if (compacted) {
    output += "\n=== COMPACTED HISTORY ===\n";
    output += `Compacted at: ${compacted.compactedAt}\n\n`;
    compacted.channels.forEach((channel, chIndex) => {
      output += `Channel ${chIndex + 1}: ${channel.author} (${channel.videos.length} videos)\n`;
      channel.videos.forEach((video, vIndex) => {
        output += `  [${vIndex}] ${video.videoData.title}\n`;
        output += `      Video ID: ${video.videoData.video_id}\n`;
        output += `      Viewed: ${video.dateViewed}\n`;
      });
      output += "\n";
    });
  }

  alert(output);
}
