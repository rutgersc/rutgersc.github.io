import { renderVideoItem } from './ui.js';

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
  console.log("renderHistory", history);

  history.forEach(({ videoData, dateViewed, wasWatchLater }) => {
    const listItem = renderVideoItem(videoData, dateViewed, {
      onRemove: (videoId) => {
        // Remove from history
        const history = getHistory();
        const filtered = history.filter(item => item.videoData.video_id !== videoId);
        localStorage.setItem("history", JSON.stringify(filtered));
        renderHistory();
      },
      wasWatchLater: wasWatchLater || false
    });
    history_list.appendChild(listItem);
  });
}

export function clearHistory() {
  console.log("clearHistory");
  localStorage.removeItem("history");
  renderHistory();
}
