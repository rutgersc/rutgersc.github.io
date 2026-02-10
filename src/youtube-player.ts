import { extractYouTubeId, extractTimestamp, formatTime, resolveChannelDetails, VideoProgress } from './video-utils.js';
import { addToHistory, updateHistoryProgress } from './history.js';
import { isVideoInWatchLater, removeFromWatchLater, loadWatchLater } from './watch-later.js';
import { fetchChapters, renderChapters, highlightCurrentChapter, type Chapter } from './chapters.js';

declare global {
  const YT: {
    Player: new (elementId: string, config: YTPlayerConfig) => YTPlayer;
    PlayerState: {
      UNSTARTED: -1;
      ENDED: 0;
      PLAYING: 1;
      PAUSED: 2;
      BUFFERING: 3;
      CUED: 5;
    };
  };

  interface YTPlayerConfig {
    height?: string | number;
    width?: string | number;
    videoId?: string;
    playerVars?: YTPlayerVars;
    events?: {
      onReady?: (event: YTPlayerEvent) => void;
      onStateChange?: (event: YTStateChangeEvent) => void;
      onError?: (event: YTErrorEvent) => void;
    };
  }

  interface YTPlayerVars {
    autoplay?: 0 | 1;
    controls?: 0 | 1 | 2;
    start?: number;
    end?: number;
    loop?: 0 | 1;
    modestbranding?: 0 | 1;
    rel?: 0 | 1;
  }

  interface YTPlayer {
    loadVideoById(videoId: string, startSeconds?: number): void;
    cueVideoById(videoId: string, startSeconds?: number): void;
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
    seekTo(seconds: number, allowSeekAhead?: boolean): void;
    getVideoUrl(): string;
    getVideoData(): YTVideoData;
    getCurrentTime(): number;
    getDuration(): number;
    getPlayerState(): number;
    getVolume(): number;
    setVolume(volume: number): void;
    mute(): void;
    unMute(): void;
    isMuted(): boolean;
    destroy(): void;
  }

  interface YTVideoData {
    video_id: string;
    title: string;
    author: string;
  }

  interface YTPlayerEvent {
    target: YTPlayer;
  }

  interface YTStateChangeEvent extends YTPlayerEvent {
    data: number;
  }

  interface YTErrorEvent extends YTPlayerEvent {
    data: number;
  }

  function onYouTubePlayerAPIReady(): void;

  interface Window {
    onYouTubePlayerAPIReady: typeof onYouTubePlayerAPIReady;
    aaaplayer: YTPlayer;
  }
}

export let player: YTPlayer | undefined;
let savingTimer: ReturnType<typeof setInterval> | undefined;
let currentPlayerState = -1;
let isInitialSeek = false;

let timeline: HTMLInputElement | null;
let timelineTimeSpan: HTMLElement | null;
let timelineDragSpan: HTMLElement | null;
let timelineApplyBtn: HTMLButtonElement | null;
let timelineCancelBtn: HTMLButtonElement | null;
let timelineControls: HTMLElement | null;
let timelineRelToggle: HTMLButtonElement | null;
let timelineDragging = false;
let dragValue = 0;
let dragRelative = true;
let dragOffset = 0;

let currentChapters: readonly Chapter[] = [];

let playPauseBtn: HTMLButtonElement | null;

export function initializePlayer(): void {
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/player_api";
  const firstScriptTag = document.getElementsByTagName("script")[0];
  firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

  window.onYouTubePlayerAPIReady = onYouTubePlayerAPIReady;

  timeline = document.getElementById("timeline") as HTMLInputElement | null;
  timelineTimeSpan = document.getElementById("timeline-time-span");
  timelineDragSpan = document.getElementById("timeline-drag-span");
  timelineApplyBtn = document.getElementById("timeline-apply-btn") as HTMLButtonElement | null;
  timelineCancelBtn = document.getElementById("timeline-cancel-btn") as HTMLButtonElement | null;
  timelineControls = document.getElementById("timeline-controls");
  timelineRelToggle = document.getElementById("timeline-rel-toggle") as HTMLButtonElement | null;
  playPauseBtn = document.getElementById("play-pause-btn") as HTMLButtonElement | null;

  setupTimelineListeners();
  setupPlayPauseButton();
  window.addEventListener('hashchange', onhashchange);
  window.onbeforeunload = savePosition;

  setInterval(updateTimeline, 500);
}

function onYouTubePlayerAPIReady(): void {
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

function onPlayerStateChange(e: YTStateChangeEvent): void {
  console.log("onPlayerStateChange", e);
  currentPlayerState = e.data;
  document.title = player?.getVideoData()?.title ?? document.title;
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

function savePosition(): void {
  if (!player?.getVideoUrl) return;

  if (isInitialSeek) {
    console.log("savePosition: skipping during initial seek");
    return;
  }

  const vid = extractYouTubeId(player.getVideoUrl());
  const pos = player.getCurrentTime();
  const duration = player.getDuration();
  console.log("savePosition", pos);
  if (vid) {
    localStorage.setItem("vid-" + vid, String(pos));

    if (duration > 0) {
      updateHistoryProgress(vid, pos, duration);
    }
  }
}

function getPosition(): number {
  if (!player) return 0;
  const vid = extractYouTubeId(player.getVideoUrl());
  if (!vid) return 0;
  return Number(localStorage.getItem("vid-" + vid)) || 0;
}

function updateTimeline(): void {
  if (!player || !timeline || !timelineTimeSpan || !timelineDragSpan || !timelineControls) return;
  const duration = player.getDuration();
  const current = player.getCurrentTime();
  if (duration > 0) {
    timeline.max = String(Math.floor(duration));
    if (timelineDragging) {
      if (dragRelative) {
        const target = Math.max(0, Math.min(Math.floor(current + dragOffset), Math.floor(duration)));
        dragValue = target;
        timeline.value = String(target);
        const sign = dragOffset >= 0 ? "+" : "";
        timelineDragSpan.textContent = `${sign}${dragOffset}s \u2192 ${formatTime(target)}`;
      } else {
        timeline.value = String(dragValue);
        timelineDragSpan.textContent = `\u2192 ${formatTime(dragValue)}`;
      }
      timelineDragSpan.style.display = "";
      timelineControls.style.display = "flex";
    } else {
      timeline.value = String(Math.floor(current));
      timelineDragSpan.textContent = "";
      timelineDragSpan.style.display = "none";
      timelineControls.style.display = "none";
    }
    timelineTimeSpan.textContent = formatTime(current) + " / " + formatTime(duration);
    timelineTimeSpan.style.color = "#ccc";
  } else {
    timelineTimeSpan.textContent = "--:-- / --:--";
    timelineTimeSpan.style.color = "#ccc";
    timelineDragSpan.textContent = "";
    timelineDragSpan.style.display = "none";
    timelineControls.style.display = "none";
  }

  if (timelineRelToggle) {
    timelineRelToggle.textContent = dragRelative ? "Rel" : "Abs";
    timelineRelToggle.style.color = dragRelative ? "#8ecae6" : "#ffd166";
  }

  if (currentChapters.length > 0) {
    highlightCurrentChapter(currentChapters, current);
  }
}

function setupTimelineListeners(): void {
  if (!timeline || !timelineApplyBtn || !timelineCancelBtn || !timelineControls || !timelineRelToggle) return;

  timeline.addEventListener("input", () => {
    timelineDragging = true;
    const val = Number(timeline!.value);
    if (dragRelative) {
      dragOffset = val - Math.floor(player?.getCurrentTime() ?? 0);
    } else {
      dragValue = val;
    }
    updateTimeline();
  });

  timeline.addEventListener("change", () => {
    const val = Number(timeline!.value);
    if (dragRelative) {
      dragOffset = val - Math.floor(player?.getCurrentTime() ?? 0);
    } else {
      dragValue = val;
    }
    updateTimeline();
  });

  timelineApplyBtn.onclick = () => {
    if (player?.seekTo) {
      const target = dragRelative
        ? Math.floor(player.getCurrentTime()) + dragOffset
        : dragValue;
      player.seekTo(Math.max(0, target), true);
    }
    timelineDragging = false;
    updateTimeline();
  };

  timelineCancelBtn.onclick = () => {
    timelineDragging = false;
    updateTimeline();
  };

  timelineRelToggle.onclick = () => {
    if (!player) return;
    const current = Math.floor(player.getCurrentTime());
    const duration = Math.floor(player.getDuration());
    if (dragRelative) {
      dragValue = Math.max(0, Math.min(current + dragOffset, duration));
      dragRelative = false;
    } else {
      dragOffset = dragValue - current;
      dragRelative = true;
    }
    updateTimeline();
  };

  timelineControls.querySelectorAll<HTMLButtonElement>("[data-offset]").forEach(btn => {
    btn.onclick = () => {
      dragOffset = Number(btn.dataset.offset);
      dragRelative = true;
      timelineDragging = true;
      updateTimeline();
    };
  });
}

function updatePlayPauseButton(): void {
  if (!playPauseBtn) return;

  if (currentPlayerState === 1) {
    playPauseBtn.textContent = "Pause";
    playPauseBtn.style.color = "#ff6b6b";
    playPauseBtn.onmouseout = function() {
      playPauseBtn!.style.background = '#232323';
      playPauseBtn!.style.color = '#ff6b6b';
    };
  } else {
    playPauseBtn.textContent = "Play";
    playPauseBtn.style.color = "#6cf06c";
    playPauseBtn.onmouseout = function() {
      playPauseBtn!.style.background = '#232323';
      playPauseBtn!.style.color = '#6cf06c';
    };
  }
}

function setupPlayPauseButton(): void {
  if (!playPauseBtn) return;

  playPauseBtn.onclick = function() {
    if (!player) return;

    const state = player.getPlayerState();
    if (state === 1) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  };
}

function onPlayerReady(): void {
  console.log("onPlayerReady");
  onhashchange();
  updateTimeline();
  updatePlayPauseButton();
}

function onhashchange(): void {
  const vid = window.location.hash?.substring(1);
  console.log("onhashchange", vid);
  apply_vid(vid);
}

function startSeek(retryDelay: number): void {
  if (!player) return;
  const dur = player.getDuration();
  console.log("getDuration", dur);
  if (dur > 0) {
    const tstamp = getPosition();
    console.log("seekTo", tstamp);
    player.seekTo(tstamp, true);
    setTimeout(() => {
      isInitialSeek = false;
      console.log("Initial seek complete, position saving re-enabled");
    }, 1000);
  } else {
    setTimeout(() => {
      startSeek(retryDelay * 2);
    }, retryDelay);
  }
}

export async function apply_vid(vid: string): Promise<void> {
  console.log("apply_vid", vid);
  if (vid && player) {
    const parsedUrlContainer = document.getElementById("parsed-url-container");
    const parsedUrlInput = document.getElementById("parsed-url") as HTMLInputElement | null;
    const fullUrl = `https://www.youtube.com/watch?v=${vid}`;
    if (parsedUrlInput) parsedUrlInput.value = fullUrl;
    if (parsedUrlContainer) parsedUrlContainer.style.display = "block";

    const checklistItemId = await isVideoInWatchLater(vid);
    const wasWatchLater = checklistItemId !== null;

    isInitialSeek = true;

    player.loadVideoById(vid);

    startSeek(100);

    setTimeout(async () => {
      if (!player) return;
      const videoData = player.getVideoData();
      try {
        const details = await resolveChannelDetails(videoData.video_id);
        if (details?.author_url) (videoData as { author_url?: string }).author_url = details.author_url;
      } catch {
        // ignore
      }

      const savedPosition = localStorage.getItem("vid-" + videoData.video_id);
      const currentTime = savedPosition ? parseFloat(savedPosition) : 0;
      const duration = player.getDuration() || 0;

      const progress: VideoProgress | null = duration > 0 ? { currentTime, duration, percentage: (currentTime / duration) * 100 } : null;

      addToHistory(videoData, document.title, wasWatchLater, progress);

      if (checklistItemId) {
        await removeFromWatchLater(checklistItemId, null);
        await loadWatchLater();
      }

      const chapters = await fetchChapters(videoData.video_id);
      currentChapters = chapters;
      renderChapters(chapters, (seconds) => {
        dragValue = seconds;
        dragOffset = seconds - Math.floor(player?.getCurrentTime() ?? 0);
        timelineDragging = true;
        updateTimeline();
      });
    }, 2000);
  }
}

export function apply_input_vid(str: string): void {
  const video_id = extractYouTubeId(str);
  if (video_id) {
    const timestamp = extractTimestamp(str);
    if (timestamp !== null) {
      localStorage.setItem("vid-" + video_id, String(timestamp));
    }
    window.location.hash = "#" + video_id;
  }
}

export function select_input_vid(): void {
  const input_vid = document.getElementById("input_vid") as HTMLInputElement | null;
  console.log("select_input_vid");
  if (!input_vid) return;
  input_vid.value = "";
  navigator.clipboard.readText()
    .then(text => {
      input_vid.value = text;
      apply_input_vid(text);
    });
}

export function apply_input_vid_from_button(): void {
  const input_vid = document.getElementById("input_vid") as HTMLInputElement | null;
  const str = input_vid?.value;
  if (str) {
    apply_input_vid(str);
  }
}
