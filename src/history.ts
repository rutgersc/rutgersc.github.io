import { renderVideoItem, renderCompactedSection } from './ui.js';
import { scheduleSyncToTodo, syncHistoryNow, isHistorySyncReady } from './history-sync.js';
import type { VideoData, VideoProgress } from './video-utils.js';

export interface HistoryEntry {
  videoData: VideoData;
  dateViewed: string;
  wasWatchLater?: boolean;
  progress?: VideoProgress;
}

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

interface LegacyHistoryEntry {
  videoData: VideoData;
  timestamp?: string;
  dateViewed?: string;
  wasWatchLater?: boolean;
  progress?: VideoProgress;
}

export function getHistory(): HistoryEntry[] {
  const history = JSON.parse(localStorage.getItem("history") || "[]") as LegacyHistoryEntry[];

  let needsMigration = false;
  const migratedHistory: HistoryEntry[] = history.map(item => {
    if (item.timestamp && !item.dateViewed) {
      needsMigration = true;
      return {
        videoData: item.videoData,
        dateViewed: item.timestamp,
        wasWatchLater: item.wasWatchLater || false,
        progress: item.progress
      };
    }
    return {
      videoData: item.videoData,
      dateViewed: item.dateViewed || new Date().toISOString(),
      wasWatchLater: item.wasWatchLater || false,
      progress: item.progress
    };
  });

  if (needsMigration) {
    localStorage.setItem("history", JSON.stringify(migratedHistory));
  }

  return migratedHistory;
}

export function addToHistory(videoData: VideoData, _name: string, wasWatchLater: boolean = false, progress: VideoProgress | null = null): void {
  const history = getHistory();

  const existingEntry = history.find(
    (item) => item.videoData.video_id === videoData.video_id
  );
  const preservedWasWatchLater = (existingEntry?.wasWatchLater === true) || wasWatchLater;

  const filteredHistory = history
    .filter((item) => item.videoData.video_id !== videoData.video_id);

  const dateViewed = new Date().toISOString();
  const entry: HistoryEntry = {
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

export function updateHistoryProgress(videoId: string, currentTime: number, duration: number): void {
  const history = getHistory();
  const entry = history.find(item => item.videoData.video_id === videoId);

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

export function renderHistory(): void {
  const history_list = document.getElementById("history_list");
  if (!history_list) return;

  history_list.innerHTML = "";
  const history = getHistory();
  const compacted = getCompactedHistory();
  console.log("renderHistory", history);

  history.forEach(({ videoData, dateViewed, wasWatchLater, progress }, index) => {
    const listItem = renderVideoItem(videoData, dateViewed, {
      onRemove: (videoId: string) => {
        const history = getHistory();
        const filtered = history.filter(item => item.videoData.video_id !== videoId);
        localStorage.setItem("history", JSON.stringify(filtered));
        renderHistory();
        if (isHistorySyncReady()) {
          syncHistoryNow();
        }
      },
      wasWatchLater: wasWatchLater || false,
      progress: progress || null,
      showCompactButton: true,
      onCompact: () => {
        compactHistoryUpTo(index + 1);
      }
    });
    history_list.appendChild(listItem);
  });

  if (compacted) {
    const compactedSection = renderCompactedSection(compacted);
    history_list.appendChild(compactedSection);
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

export function getCompactedHistory(): CompactedHistory | null {
  return JSON.parse(localStorage.getItem("compactedHistory") || "null") as CompactedHistory | null;
}

function setCompactedHistory(compacted: CompactedHistory): void {
  localStorage.setItem("compactedHistory", JSON.stringify(compacted));
}

export function compactHistoryUpTo(index: number): void {
  const history = getHistory();

  const eventsToCompact = history.slice(index);

  const channelKey = (g: { author_id?: string; author_url?: string; author: string }) =>
    g.author_id || g.author_url || g.author;

  const existing = getCompactedHistory();
  const channelGroups: Record<string, ChannelGroup> = (existing?.channels ?? []).reduce(
    (acc, group) => ({ ...acc, [channelKey(group)]: { ...group, videos: [...group.videos] } }),
    {} as Record<string, ChannelGroup>
  );

  eventsToCompact.forEach(event => {
    const key = channelKey(event.videoData);
    if (!channelGroups[key]) {
      channelGroups[key] = {
        author: event.videoData.author,
        author_url: event.videoData.author_url,
        author_id: event.videoData.author_id,
        videos: []
      };
    }
    channelGroups[key].videos.push({
      videoData: event.videoData,
      dateViewed: event.dateViewed,
      wasWatchLater: event.wasWatchLater
    });
  });

  const deduped = Object.values(channelGroups).map(group => ({
    ...group,
    videos: Object.values(
      group.videos.reduce((acc, v) => {
        const prev = acc[v.videoData.video_id];
        if (!prev || v.dateViewed > prev.dateViewed) {
          acc[v.videoData.video_id] = v;
        }
        return acc;
      }, {} as Record<string, (typeof group.videos)[number]>)
    )
  }));

  const compacted: CompactedHistory = {
    compactedAt: new Date().toISOString(),
    channels: deduped.sort((a, b) => b.videos.length - a.videos.length)
  };

  setCompactedHistory(compacted);

  const remainingHistory = history.slice(0, index);
  localStorage.setItem("history", JSON.stringify(remainingHistory));

  renderHistory();

  if (isHistorySyncReady()) {
    syncHistoryNow();
  }
}

export function clearCompactedHistory(): void {
  localStorage.removeItem("compactedHistory");
  renderHistory();
}

export function dumpAllEvents(): void {
  const history = getHistory();
  const compacted = getCompactedHistory();

  console.log("=== ALL EVENTS DUMP ===");
  console.log("Current History:", history);
  console.log("Compacted History:", compacted);

  let output = "=== CURRENT HISTORY ===\n\n";
  history.forEach((event, index) => {
    output += `[${index}] ${event.videoData.author} - ${event.videoData.title}\n`;
    output += `    Video ID: ${event.videoData.video_id}\n`;
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
