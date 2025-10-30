import { getTimeAgo } from './video-utils.js';
import { apply_input_vid } from './youtube-player.js';

export function renderVideoItem(videoData, timestamp, options = {}) {
  const {
    onRemove = null,
    removeButtonText = '🗑️',
    removeButtonTitle = 'Remove',
    onPlay = null,
    wasWatchLater = false
  } = options;

  const listItem = document.createElement("li");
  listItem.style.background = "#232323";
  listItem.style.borderRadius = "8px";
  listItem.style.margin = "12px auto";
  listItem.style.padding = "10px 16px";
  listItem.style.maxWidth = "480px";
  listItem.style.boxShadow = "0 2px 8px rgba(0,0,0,0.12)";
  listItem.style.display = "flex";
  listItem.style.flexDirection = "column";
  listItem.style.alignItems = "flex-start";
  listItem.style.gap = "4px";
  // Use golden color border if video was from watch later
  listItem.style.border = wasWatchLater ? "1px solid #ffd166" : "1px solid #333";

  // Top row: author, id (clickable), play button
  const topRow = document.createElement("div");
  topRow.style.display = "flex";
  topRow.style.alignItems = "center";
  topRow.style.width = "100%";
  topRow.style.justifyContent = "space-between";

  const authorP = document.createElement("a");
  authorP.textContent = videoData.author;
  authorP.style.fontWeight = "bold";
  authorP.style.fontSize = "1rem";
  authorP.style.color = "#8ecae6";
  authorP.style.cursor = "pointer";
  authorP.style.textDecoration = "none";
  authorP.title = "Visit channel";

  // Set the href based on available data
  if (videoData.author_url) {
    authorP.href = videoData.author_url;
  } else if (videoData.author_id) {
    authorP.href = `https://www.youtube.com/channel/${videoData.author_id}`;
  } else {
    // Fallback: search for the channel
    authorP.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(videoData.author)}`;
  }

  authorP.target = "_blank";
  authorP.rel = "noopener noreferrer";

  authorP.onmouseenter = () => {
    authorP.style.textDecoration = "underline";
    authorP.style.color = "#ffd166";
  };
  authorP.onmouseleave = () => {
    authorP.style.textDecoration = "none";
    authorP.style.color = "#8ecae6";
  };

  // id (clickable to open video)
  const idP = document.createElement("a");
  idP.textContent = videoData.video_id;
  idP.style.fontSize = "0.85rem";
  idP.style.color = "#bdbdbd";
  idP.style.fontFamily = "monospace";
  idP.style.marginLeft = "12px";
  idP.style.cursor = "pointer";
  idP.style.textDecoration = "none";
  idP.title = "Open video in new tab";
  idP.href = `https://www.youtube.com/watch?v=${videoData.video_id}`;
  idP.target = "_blank";
  idP.rel = "noopener noreferrer";

  idP.onmouseenter = () => {
    idP.style.textDecoration = "underline";
    idP.style.color = "#ffd166";
  };
  idP.onmouseleave = () => {
    idP.style.textDecoration = "none";
    idP.style.color = "#bdbdbd";
  };

  // Add timestamp if available
  const timestampSpan = document.createElement("span");
  if (timestamp) {
    const date = new Date(timestamp);
    const timeAgo = getTimeAgo(date);
    timestampSpan.textContent = timeAgo;
    timestampSpan.style.fontSize = "0.8rem";
    timestampSpan.style.color = "#888";
    timestampSpan.style.fontStyle = "italic";
    timestampSpan.style.marginLeft = "12px";
  }

  const playButton = document.createElement("button");
  playButton.textContent = "▶️";
  playButton.title = "Play";
  playButton.style.background = "#2d6a4f";
  playButton.style.color = "#fff";
  playButton.style.border = "none";
  playButton.style.borderRadius = "4px";
  playButton.style.padding = "4px 10px";
  playButton.style.cursor = "pointer";
  playButton.style.fontSize = "1.1em";
  playButton.style.marginLeft = "8px";
  playButton.onmouseenter = () => playButton.style.background = "#40916c";
  playButton.onmouseleave = () => playButton.style.background = "#2d6a4f";
  playButton.onclick = () => {
    if (onPlay) {
      onPlay(videoData.video_id);
    }
    apply_input_vid(videoData.video_id);
  };

  // Remove button (if onRemove callback provided)
  let removeButton = null;
  if (onRemove) {
    removeButton = document.createElement("button");
    removeButton.textContent = removeButtonText;
    removeButton.title = removeButtonTitle;
    removeButton.style.background = "#8b0000";
    removeButton.style.color = "#fff";
    removeButton.style.border = "none";
    removeButton.style.borderRadius = "4px";
    removeButton.style.padding = "4px 10px";
    removeButton.style.cursor = "pointer";
    removeButton.style.fontSize = "1.1em";
    removeButton.style.marginLeft = "8px";
    removeButton.onmouseenter = () => removeButton.style.background = "#a00000";
    removeButton.onmouseleave = () => removeButton.style.background = "#8b0000";
    removeButton.onclick = () => onRemove(videoData.video_id);
  }

  // Expand/Collapse button
  const expandBtn = document.createElement("button");
  expandBtn.textContent = "▾";
  expandBtn.title = "Expand channel videos";
  expandBtn.style.background = "#3a3a3a";
  expandBtn.style.color = "#fff";
  expandBtn.style.border = "none";
  expandBtn.style.borderRadius = "4px";
  expandBtn.style.padding = "4px 10px";
  expandBtn.style.cursor = "pointer";
  expandBtn.style.fontSize = "1.1em";
  expandBtn.style.marginLeft = "8px";
  expandBtn.onmouseenter = () => expandBtn.style.background = "#4a4a4a";
  expandBtn.onmouseleave = () => expandBtn.style.background = "#3a3a3a";

  // Assemble top row
  const leftGroup = document.createElement("span");
  leftGroup.style.display = "flex";
  leftGroup.style.alignItems = "center";
  leftGroup.appendChild(authorP);
  leftGroup.appendChild(idP);
  if (timestamp) {
    leftGroup.appendChild(timestampSpan);
  }

  topRow.appendChild(leftGroup);
  const rightGroup = document.createElement("span");
  rightGroup.appendChild(playButton);
  if (removeButton) rightGroup.appendChild(removeButton);
  rightGroup.appendChild(expandBtn);
  topRow.appendChild(rightGroup);

  // Title row
  const titleP = document.createElement("span");
  titleP.textContent = videoData.title;
  titleP.style.fontSize = "1.05rem";
  titleP.style.fontWeight = "500";
  titleP.style.color = "#fff";
  titleP.style.marginTop = "2px";
  titleP.style.marginBottom = "2px";
  titleP.style.wordBreak = "break-word";

  // Expandable container for latest videos
  const expandContainer = document.createElement("div");
  expandContainer.style.display = "none";
  expandContainer.style.width = "100%";
  expandContainer.style.marginTop = "6px";
  expandContainer.style.padding = "8px 10px";
  expandContainer.style.background = "#1c1c1c";
  expandContainer.style.border = "1px solid #333";
  expandContainer.style.borderRadius = "6px";
  expandContainer.style.boxSizing = "border-box";

  const expandStatus = document.createElement("div");
  expandStatus.style.color = "#bbb";
  expandStatus.style.fontSize = "0.9rem";
  expandStatus.textContent = "Loading...";
  expandContainer.appendChild(expandStatus);

  async function toggleExpand() {
    const isOpen = expandContainer.style.display !== "none";
    if (isOpen) {
      expandContainer.style.display = "none";
      expandBtn.textContent = "▾";
      expandBtn.title = "Expand channel videos";
      return;
    }
    expandContainer.style.display = "block";
    // Placeholder UI only; fetching disabled for now
    expandStatus.textContent = "Channel videos placeholder (fetching disabled).";
    expandBtn.textContent = "▴";
    expandBtn.title = "Collapse";
    // Intentionally do not fetch latest videos; keep placeholder visible
    return;
  }

  expandBtn.onclick = toggleExpand;

  // Assemble
  listItem.appendChild(topRow);
  listItem.appendChild(titleP);
  listItem.appendChild(expandContainer);

  return listItem;
}

// Viewport management
export function initViewportManager() {
  const switchWidthBtn = document.getElementById("switch-width-btn");
  const ytplayer = document.getElementById("ytplayer");
  const timeline = document.getElementById("timeline");
  const timelineTime = document.getElementById("timeline-time");
  let isFullWidth = true;

  const handleViewportChange = () => setFullWidth(false);

  function setFullWidth(full) {
    if (full) {
      ytplayer.style.width = "100%";
      timeline.style.width = "100%";
      ytplayer.style.margin = "";
      ytplayer.style.position = "";
      ytplayer.style.left = "";
      ytplayer.style.transform = "";
      timeline.style.margin = "";
      timeline.style.position = "";
      timeline.style.left = "";
      timeline.style.transform = "";
      timelineTime.style.position = "";
      timelineTime.style.left = "";
      timelineTime.style.width = "";
      switchWidthBtn.textContent = "Viewport";
    } else {
      // Use viewport dimensions and position, accounting for zoom and scroll
      const viewportWidth = window.visualViewport.width;
      const viewportLeft = window.visualViewport.offsetLeft;

      // Set width to viewport width
      ytplayer.style.width = viewportWidth + "px";
      timeline.style.width = viewportWidth + "px";

      // Position elements to be centered in the current viewport
      ytplayer.style.position = "relative";
      ytplayer.style.left = viewportLeft + "px";
      ytplayer.style.margin = "0";

      timeline.style.position = "relative";
      timeline.style.left = viewportLeft + "px";
      timeline.style.margin = "10px 0";

      timelineTime.style.position = "relative";
      timelineTime.style.left = viewportLeft + "px";
      timelineTime.style.width = viewportWidth + "px";

      switchWidthBtn.textContent = "Full";
    }
    isFullWidth = full;
  }

  switchWidthBtn.onclick = function() {
    const newFullWidth = !isFullWidth;
    setFullWidth(newFullWidth);

    if (newFullWidth) {
      window.visualViewport.removeEventListener("resize", handleViewportChange);
      window.visualViewport.removeEventListener("scroll", handleViewportChange);
    } else {
      window.visualViewport.addEventListener("resize", handleViewportChange);
      window.visualViewport.addEventListener("scroll", handleViewportChange);
    }
  };

  // Set initial state
  setFullWidth(true);
}
