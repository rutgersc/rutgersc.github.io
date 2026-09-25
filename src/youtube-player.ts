import { extractYouTubeId, parseVideoRef, formatTime, resolveChannelDetails, VideoProgress, VideoData } from './video-utils.js';
import { addToHistory, addXToHistory, updateHistoryProgress, getHistoryProgress } from './history.js';
import { isVideoInWatchLater, removeFromWatchLater, loadWatchLater } from './watch-later.js';
import { fetchChapters, renderChapters, highlightCurrentChapter, type Chapter } from './chapters.js';
import { hideXVideo, showXVideo } from './x-player.js';

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

const CURRENT_VID_KEY = "current-vid";
const CURRENT_X_POST_KEY = 'current-x-post';

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
const onPlayerReadyHooks: (() => void)[] = [];

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
  setupVolumeControls();
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
  if (localStorage.getItem(CURRENT_X_POST_KEY)) {
    clearInterval(savingTimer);
    return;
  }
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
  if (!player?.getVideoUrl || localStorage.getItem(CURRENT_X_POST_KEY)) return;

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

function getSavedPosition(vid: string): number {
  const local = Number(localStorage.getItem("vid-" + vid)) || 0;
  return Math.max(local, getHistoryProgress(vid));
}

function getPosition(): number {
  if (!player) return 0;
  const vid = extractYouTubeId(player.getVideoUrl());
  if (!vid) return 0;
  return getSavedPosition(vid);
}

function updateTimeline(): void {
  if (!player || typeof player.getDuration !== "function" || !timeline || !timelineTimeSpan || !timelineDragSpan || !timelineControls) return;
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
    } else {
      timeline.value = String(Math.floor(current));
      timelineDragSpan.textContent = "";
      timelineDragSpan.style.display = "none";
    }
    timelineTimeSpan.textContent = formatTime(current) + " / " + formatTime(duration);
    timelineTimeSpan.style.color = "#ccc";
  } else {
    timelineTimeSpan.textContent = "--:-- / --:--";
    timelineTimeSpan.style.color = "#ccc";
    timelineDragSpan.textContent = "";
    timelineDragSpan.style.display = "none";
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
    if (!timelineDragging) return;
    if (player?.seekTo) {
      const target = dragRelative
        ? Math.floor(player.getCurrentTime()) + dragOffset
        : dragValue;
      player.seekTo(Math.max(0, target), true);
    }
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

function setupVolumeControls(): void {
  const volumeLabel = document.getElementById("volume-label");
  const volDownBtn = document.getElementById("vol-down-btn") as HTMLButtonElement | null;
  const volUpBtn = document.getElementById("vol-up-btn") as HTMLButtonElement | null;
  const volumeFill = document.getElementById("volume-fill");
  if (!volumeLabel || !volDownBtn || !volUpBtn) return;

  let currentVol = Number(localStorage.getItem("yt-volume") ?? "100");

  const renderVolume = () => {
    volumeLabel.textContent = String(currentVol);
    if (volumeFill) volumeFill.style.width = `${currentVol}%`;
  };

  const setVolume = (vol: number) => {
    currentVol = Math.max(0, Math.min(100, vol));
    if (player) player.setVolume(currentVol);
    renderVolume();
    localStorage.setItem("yt-volume", String(currentVol));
  };

  renderVolume();

  volDownBtn.onclick = () => setVolume(currentVol - 10);
  volUpBtn.onclick = () => setVolume(currentVol + 10);

  onPlayerReadyHooks.push(() => setVolume(currentVol));
}

function onPlayerReady(): void {
  console.log("onPlayerReady");
  const postId = localStorage.getItem(CURRENT_X_POST_KEY);
  if (postId) {
    showXCurrentUi(postId);
    showXVideo(postId);
  }
  else restoreCurrentVideo();
  updateTimeline();
  updatePlayPauseButton();
  onPlayerReadyHooks.forEach(fn => fn());
}

function restoreCurrentVideo(): void {
  const vid = localStorage.getItem(CURRENT_VID_KEY);
  console.log("restoreCurrentVideo", vid);
  if (vid) apply_vid(vid, false);
}

function startSeek(retryDelay: number): void {
  if (!player || localStorage.getItem(CURRENT_X_POST_KEY)) return;
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

export async function apply_vid(vid: string, addHistory: boolean = true): Promise<void> {
  console.log("apply_vid", vid);
  if (vid && player) {
    localStorage.removeItem(CURRENT_X_POST_KEY);
    hideXVideo();
    const parsedUrlContainer = document.getElementById("parsed-url-container");
    const parsedUrlInput = document.getElementById("parsed-url") as HTMLInputElement | null;
    const fullUrl = `https://www.youtube.com/watch?v=${vid}`;
    if (parsedUrlInput) parsedUrlInput.value = fullUrl;
    if (parsedUrlContainer) parsedUrlContainer.style.display = "block";

    const checklistItemId = await isVideoInWatchLater({ kind: 'youtube', id: vid, startSeconds: null });
    if (localStorage.getItem(CURRENT_X_POST_KEY) || localStorage.getItem(CURRENT_VID_KEY) !== vid) return;
    const wasWatchLater = checklistItemId !== null;

    isInitialSeek = true;

    player.loadVideoById(vid);

    startSeek(100);

    const isStale = (): boolean => localStorage.getItem(CURRENT_X_POST_KEY) !== null || localStorage.getItem(CURRENT_VID_KEY) !== vid;

    const waitForPlayerData = async (attempts: number): Promise<YTVideoData | null> => {
      const raw = player?.getVideoData();
      if (raw?.video_id === vid && raw.title && raw.author) return raw;
      if (attempts <= 1 || isStale()) return raw?.video_id === vid ? raw : null;
      await new Promise(resolve => setTimeout(resolve, 500));
      return waitForPlayerData(attempts - 1);
    };

    (async () => {
      const detailsPromise = resolveChannelDetails(vid);
      const raw = await waitForPlayerData(20);
      if (!player || isStale()) return;
      const details = await detailsPromise;
      if (isStale()) return;
      const videoData: VideoData = {
        video_id: vid,
        title: raw?.title || details.title || "",
        author: raw?.author || details.author || "",
        ...(details.author_url ? { author_url: details.author_url } : {})
      };

      const currentTime = getSavedPosition(videoData.video_id);
      const duration = player.getDuration() || 0;

      const progress: VideoProgress | null = duration > 0 ? { currentTime, duration, percentage: (currentTime / duration) * 100 } : null;

      if (addHistory) {
        addToHistory(videoData, document.title, wasWatchLater, progress);
      }

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
    })();
  }
}

export function apply_input_vid(str: string): void {
  const ref = parseVideoRef(str);
  if (!ref) return;
  if (ref.kind === 'youtube') {
    if (ref.startSeconds !== null) localStorage.setItem('vid-' + ref.id, String(ref.startSeconds));
    localStorage.setItem(CURRENT_VID_KEY, ref.id);
    localStorage.removeItem(CURRENT_X_POST_KEY);
    hideXVideo();
    apply_vid(ref.id);
    return;
  }

  savePosition();
  localStorage.setItem(CURRENT_X_POST_KEY, ref.postId);
  player?.stopVideo();
  showXCurrentUi(ref.postId);
  showXVideo(ref.postId);
  isVideoInWatchLater(ref).then(async checklistItemId => {
    if (localStorage.getItem(CURRENT_X_POST_KEY) !== ref.postId) return;
    addXToHistory(ref.postId, checklistItemId !== null);
    if (checklistItemId) {
      await removeFromWatchLater(checklistItemId, null);
      await loadWatchLater();
    }
  });
}

function showXCurrentUi(postId: string): void {
  document.title = 'X video';
  const parsedUrl = document.getElementById('parsed-url') as HTMLInputElement | null;
  if (parsedUrl) parsedUrl.value = `https://x.com/i/status/${postId}`;
  const parsedUrlContainer = document.getElementById('parsed-url-container');
  if (parsedUrlContainer) parsedUrlContainer.style.display = 'block';
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
