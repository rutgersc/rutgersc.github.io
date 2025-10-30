import { extractYouTubeId, formatTime } from './video-utils.js';
import { addToHistory } from './history.js';
import { isVideoInWatchLater, removeFromWatchLater, loadWatchLater } from './watch-later.js';
import { resolveChannelDetails } from './video-utils.js';

export let player;
let savingTimer;
let currentPlayerState = -1;

let timeline;
let timelineTime;
let timelineTimeSpan;
let timelineDragSpan;
let timelineApplyBtn;
let timelineCancelBtn;
let timelineDragging = false;
let dragValue = 0;

let playPauseBtn;

export function initializePlayer() {
  // Load YouTube API
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/player_api";
  const firstScriptTag = document.getElementsByTagName("script")[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

  // Make onYouTubePlayerAPIReady global so YouTube API can call it
  window.onYouTubePlayerAPIReady = onYouTubePlayerAPIReady;

  // Initialize DOM elements
  timeline = document.getElementById("timeline");
  timelineTime = document.getElementById("timeline-time");
  timelineTimeSpan = document.getElementById("timeline-time-span");
  timelineDragSpan = document.getElementById("timeline-drag-span");
  timelineApplyBtn = document.getElementById("timeline-apply-btn");
  timelineCancelBtn = document.getElementById("timeline-cancel-btn");
  playPauseBtn = document.getElementById("play-pause-btn");

  // Setup event listeners
  setupTimelineListeners();
  setupPlayPauseButton();
  window.addEventListener('hashchange', onhashchange);
  window.onbeforeunload = savePosition;

  // Start timeline updates
  setInterval(updateTimeline, 500);
}

function onYouTubePlayerAPIReady() {
  console.log("onYouTubePlayerAPIReady");
  window.aaaplayer = player = new YT.Player("ytplayer", {
    height: "315",
    width: "560",
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
    },
  });
}

function onPlayerStateChange(e) {
  console.log("onPlayerStateChange", e);
  currentPlayerState = e.data;
  document.title = player.getVideoData()?.title;
  updatePlayPauseButton();

  if (e?.data === 2) {
    setTimeout(() => {
      savePosition();
    }, 2000);
  }
  if (e?.data === 1) {
    savingTimer = setInterval(() => {
      savePosition();
    }, 20000);
  } else {
    clearInterval(savingTimer);
  }
}

function savePosition() {
  if (!player || !player.getVideoUrl) return;
  const vid = extractYouTubeId(player.getVideoUrl());
  const pos = player.getCurrentTime();
  console.log("savePosition", pos);
  localStorage.setItem("vid-" + vid, pos);
}

function getPosition() {
  const vid = extractYouTubeId(player.getVideoUrl());
  return localStorage.getItem("vid-" + vid) - 0;
}

function updateTimeline() {
  console.log("updating timeline")
  if (!player) return;
  const duration = player.getDuration();
  let current = player.getCurrentTime();
  if (duration > 0) {
    timeline.max = Math.floor(duration);
    if (!timelineDragging) {
      timeline.value = Math.floor(current);
    }
    timelineTimeSpan.textContent = formatTime(current) + " / " + formatTime(duration);
    timelineTimeSpan.style.color = "#ccc";
    if (timelineDragging) {
      timelineDragSpan.textContent = formatTime(dragValue);
      timelineDragSpan.style.display = "";
      timelineApplyBtn.style.display = "";
      timelineCancelBtn.style.display = "";
    } else {
      timelineDragSpan.textContent = "";
      timelineDragSpan.style.display = "none";
      timelineApplyBtn.style.display = "none";
      timelineCancelBtn.style.display = "none";
    }
  } else {
    timelineTimeSpan.textContent = "--:-- / --:--";
    timelineTimeSpan.style.color = "#ccc";
    timelineDragSpan.textContent = "";
    timelineDragSpan.style.display = "none";
    timelineApplyBtn.style.display = "none";
    timelineCancelBtn.style.display = "none";
  }
}

function setupTimelineListeners() {
  timeline.addEventListener("input", function () {
    timelineDragging = true;
    dragValue = Number(timeline.value);
    updateTimeline();
  });

  timeline.addEventListener("change", function () {
    dragValue = Number(timeline.value);
    updateTimeline();
  });

  timelineApplyBtn.onclick = function() {
    if (player && player.seekTo) {
      player.seekTo(Number(dragValue), true);
    }
    timelineDragging = false;
    updateTimeline();
  };

  timelineCancelBtn.onclick = function() {
    timelineDragging = false;
    updateTimeline();
  };
}

function updatePlayPauseButton() {
  if (!playPauseBtn) return;

  // PlayerState: 1 = playing, 2 = paused
  if (currentPlayerState === 1) {
    playPauseBtn.textContent = "Pause";
    playPauseBtn.style.color = "#ff6b6b";
    playPauseBtn.onmouseout = function() {
      this.style.background='#232323';
      this.style.color='#ff6b6b';
    };
  } else {
    playPauseBtn.textContent = "Play";
    playPauseBtn.style.color = "#6cf06c";
    playPauseBtn.onmouseout = function() {
      this.style.background='#232323';
      this.style.color='#6cf06c';
    };
  }
}

function setupPlayPauseButton() {
  playPauseBtn.onclick = function() {
    if (!player) return;

    const state = player.getPlayerState();
    if (state === 1) {
      // Currently playing, so pause
      player.pauseVideo();
    } else {
      // Currently paused or stopped, so play
      player.playVideo();
    }
  };
}

function onPlayerReady() {
  console.log("onPlayerReady");
  onhashchange();
  updateTimeline();
  updatePlayPauseButton();
}

function onhashchange() {
  const vid = window.location.hash?.substring(1);
  console.log("onhashchange", vid);
  apply_vid(vid);
}

function startSeek(retryDelay) {
  const dur = player.getDuration();
  console.log("getDuration", dur);
  if (dur > 0) {
    const tstamp = getPosition();
    console.log("seekTo", tstamp);
    player.seekTo(tstamp, true);
  } else {
    setTimeout(() => {
      startSeek(retryDelay * 2);
    }, retryDelay);
  }
}

export async function apply_vid(vid) {
  console.log("apply_vid", vid);
  if (vid) {
    // Show parsed URL
    const parsedUrlContainer = document.getElementById("parsed-url-container");
    const parsedUrlInput = document.getElementById("parsed-url");
    const fullUrl = `https://www.youtube.com/watch?v=${vid}`;
    parsedUrlInput.value = fullUrl;
    parsedUrlContainer.style.display = "block";

    // Check if video is in watch later
    const checklistItemId = await isVideoInWatchLater(vid);
    const wasWatchLater = checklistItemId !== null;

    player.loadVideoById(vid);

    startSeek(100);

    setTimeout(async () => {
      const videoData = player.getVideoData();
      try {
        const details = await resolveChannelDetails(videoData.video_id);
        if (details?.author_url) videoData.author_url = details.author_url;
      } catch (e) {}

      // Add to history with wasWatchLater flag
      addToHistory(videoData, document.title, wasWatchLater);

      // If it was in watch later, remove it
      if (checklistItemId) {
        await removeFromWatchLater(checklistItemId, null);
        // Reload watch later list to reflect the change
        await loadWatchLater();
      }
    }, 2000);
  }
}

export function apply_input_vid(str) {
  const video_id = extractYouTubeId(str);
  if (video_id) {
    window.location.hash = "#" + video_id;
  }
}

export function select_input_vid() {
  const input_vid = document.getElementById("input_vid");
  console.log("select_input_vid");
  input_vid.value = "";
  navigator.clipboard.readText()
    .then(text => {
      input_vid.value = text
      apply_input_vid(text)
    });
}

export function apply_input_vid_from_button() {
  const input_vid = document.getElementById("input_vid");
  const str = input_vid.value;
  if (str) {
    apply_input_vid(str);
  }
}
