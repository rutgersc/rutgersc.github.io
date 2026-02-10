import { renderVideoItem, renderCompactedSection } from './ui.js';
import { scheduleSyncToTodo, syncHistoryNow, isHistorySyncReady } from './history-sync.js';
export function getHistory() {
    const history = JSON.parse(localStorage.getItem("history") || "[]");
    let needsMigration = false;
    const migratedHistory = history.map(item => {
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
export function addToHistory(videoData, _name, wasWatchLater = false, progress = null) {
    const history = getHistory();
    const existingEntry = history.find((item) => item.videoData.video_id === videoData.video_id);
    const preservedWasWatchLater = (existingEntry?.wasWatchLater === true) || wasWatchLater;
    const filteredHistory = history
        .filter((item) => item.videoData.video_id !== videoData.video_id);
    const dateViewed = new Date().toISOString();
    const entry = {
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
export function updateHistoryProgress(videoId, currentTime, duration) {
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
export function renderHistory() {
    const history_list = document.getElementById("history_list");
    if (!history_list)
        return;
    history_list.innerHTML = "";
    const history = getHistory();
    const compacted = getCompactedHistory();
    console.log("renderHistory", history);
    history.forEach(({ videoData, dateViewed, wasWatchLater, progress }, index) => {
        const listItem = renderVideoItem(videoData, dateViewed, {
            onRemove: (videoId) => {
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
export function clearHistory() {
    console.log("clearHistory");
    localStorage.removeItem("history");
    localStorage.removeItem("compactedHistory");
    renderHistory();
    if (isHistorySyncReady()) {
        syncHistoryNow();
    }
}
export function getCompactedHistory() {
    return JSON.parse(localStorage.getItem("compactedHistory") || "null");
}
function setCompactedHistory(compacted) {
    localStorage.setItem("compactedHistory", JSON.stringify(compacted));
}
export function compactHistoryUpTo(index) {
    const history = getHistory();
    const eventsToCompact = history.slice(index);
    const channelKey = (g) => g.author_id || g.author_url || g.author;
    const existing = getCompactedHistory();
    const channelGroups = (existing?.channels ?? []).reduce((acc, group) => ({ ...acc, [channelKey(group)]: { ...group, videos: [...group.videos] } }), {});
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
        videos: Object.values(group.videos.reduce((acc, v) => {
            const prev = acc[v.videoData.video_id];
            if (!prev || v.dateViewed > prev.dateViewed) {
                acc[v.videoData.video_id] = v;
            }
            return acc;
        }, {}))
    }));
    const compacted = {
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
export function clearCompactedHistory() {
    localStorage.removeItem("compactedHistory");
    renderHistory();
}
export function dumpAllEvents() {
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
