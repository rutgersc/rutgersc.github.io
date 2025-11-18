import { renderVideoItem } from './ui.js';

export function getHistory() {
  const history = JSON.parse(localStorage.getItem("history") || "[]");
  return history;
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

  // Add the new entry to the front with timestamp
  const timestamp = new Date().toISOString();
  filteredHistory.unshift({ videoData, timestamp, wasWatchLater: preservedWasWatchLater });
  localStorage.setItem("history", JSON.stringify(filteredHistory));

  console.log(history);

  renderHistory();
}

export function renderHistory() {
  const history_list = document.getElementById("history_list");
  history_list.innerHTML = "";
  const history = getHistory();
  console.log("renderHistory", history);

  history.forEach(({ videoData, timestamp, wasWatchLater }) => {
    const listItem = renderVideoItem(videoData, timestamp, {
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
