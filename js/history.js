import { renderVideoItem, renderCompactedSection } from './ui.js';

export function getHistory() {
  const history = JSON.parse(localStorage.getItem("history") || "[]");

  // Migrate old format (timestamp) to new format (dateViewed)
  let needsMigration = false;
  const migratedHistory = history.map(item => {
    if (item.timestamp && !item.dateViewed) {
      needsMigration = true;
      return {
        videoData: item.videoData,
        dateViewed: item.timestamp,
        wasWatchLater: item.wasWatchLater || false
      };
    }
    return item;
  });

  // Save migrated data back to localStorage
  if (needsMigration) {
    localStorage.setItem("history", JSON.stringify(migratedHistory));
  }

  return migratedHistory;
}

export function addToHistory(videoData, name, wasWatchLater = false) {
  const history = getHistory();

  // Check if an existing entry has wasWatchLater = true
  const existingEntry = history.find(
    (item) => item.videoData.video_id === videoData.video_id
  );
  // Preserve wasWatchLater if it was previously true
  const preservedWasWatchLater = (existingEntry?.wasWatchLater === true) || wasWatchLater;

  // Remove any existing entry with the same video_id
  const filteredHistory = history
    .filter((item) => item.videoData.video_id !== videoData.video_id);

  // Add the new entry to the front with dateViewed
  const dateViewed = new Date().toISOString();
  filteredHistory.unshift({ videoData, dateViewed, wasWatchLater: preservedWasWatchLater });
  localStorage.setItem("history", JSON.stringify(filteredHistory));

  console.log(history);

  renderHistory();
}

export function renderHistory() {
  const history_list = document.getElementById("history_list");
  history_list.innerHTML = "";
  const history = getHistory();
  const compacted = getCompactedHistory();
  console.log("renderHistory", history);

  // Render compacted section first if it exists
  if (compacted) {
    const compactedSection = renderCompactedSection(compacted);
    history_list.appendChild(compactedSection);
  }

  // Render current history items with compact buttons
  history.forEach(({ videoData, dateViewed, wasWatchLater }, index) => {
    const listItem = renderVideoItem(videoData, dateViewed, {
      onRemove: (videoId) => {
        // Remove from history
        const history = getHistory();
        const filtered = history.filter(item => item.videoData.video_id !== videoId);
        localStorage.setItem("history", JSON.stringify(filtered));
        renderHistory();
      },
      wasWatchLater: wasWatchLater || false,
      showCompactButton: true,
      onCompact: () => {
        // Compact history up to and including this index
        compactHistoryUpTo(index + 1);
      }
    });
    history_list.appendChild(listItem);
  });
}

export function clearHistory() {
  console.log("clearHistory");
  localStorage.removeItem("history");
  localStorage.removeItem("compactedHistory");
  renderHistory();
}

// Get compacted history data
export function getCompactedHistory() {
  return JSON.parse(localStorage.getItem("compactedHistory") || "null");
}

// Set compacted history data
function setCompactedHistory(compacted) {
  localStorage.setItem("compactedHistory", JSON.stringify(compacted));
}

// Compact history up to and including the specified index
export function compactHistoryUpTo(index) {
  const history = getHistory();

  // Get events to compact (from index to end of array)
  const eventsToCompact = history.slice(index);

  // Group by channel (author)
  const channelGroups = {};
  eventsToCompact.forEach(event => {
    const channelKey = event.videoData.author_id || event.videoData.author_url || event.videoData.author;
    if (!channelGroups[channelKey]) {
      channelGroups[channelKey] = {
        author: event.videoData.author,
        author_url: event.videoData.author_url,
        author_id: event.videoData.author_id,
        videos: []
      };
    }
    channelGroups[channelKey].videos.push({
      videoData: event.videoData,
      dateViewed: event.dateViewed,
      wasWatchLater: event.wasWatchLater
    });
  });

  // Convert to array and sort by number of videos (most watched first)
  const sortedChannels = Object.values(channelGroups).sort((a, b) => b.videos.length - a.videos.length);

  // Create compacted data structure
  const compacted = {
    compactedAt: new Date().toISOString(),
    channels: sortedChannels
  };

  // Save compacted history
  setCompactedHistory(compacted);

  // Remove compacted events from regular history
  const remainingHistory = history.slice(0, index);
  localStorage.setItem("history", JSON.stringify(remainingHistory));

  // Re-render
  renderHistory();
}

// Clear compacted history
export function clearCompactedHistory() {
  localStorage.removeItem("compactedHistory");
  renderHistory();
}

// Dump all events for debugging
export function dumpAllEvents() {
  const history = getHistory();
  const compacted = getCompactedHistory();

  console.log("=== ALL EVENTS DUMP ===");
  console.log("Current History:", history);
  console.log("Compacted History:", compacted);

  // Create a readable output
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
