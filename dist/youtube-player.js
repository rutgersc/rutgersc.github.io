import { extractYouTubeId, extractTimestamp, formatTime, resolveChannelDetails } from './video-utils.js';
import { addToHistory, updateHistoryProgress } from './history.js';
import { isVideoInWatchLater, removeFromWatchLater, loadWatchLater } from './watch-later.js';
export let player;
let savingTimer;
let currentPlayerState = -1;
let isInitialSeek = false;
let timeline;
let timelineTimeSpan;
let timelineDragSpan;
let timelineApplyBtn;
let timelineCancelBtn;
let timelineDragging = false;
let dragValue = 0;
let playPauseBtn;
export function initializePlayer() {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/player_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    window.onYouTubePlayerAPIReady = onYouTubePlayerAPIReady;
    timeline = document.getElementById("timeline");
    timelineTimeSpan = document.getElementById("timeline-time-span");
    timelineDragSpan = document.getElementById("timeline-drag-span");
    timelineApplyBtn = document.getElementById("timeline-apply-btn");
    timelineCancelBtn = document.getElementById("timeline-cancel-btn");
    playPauseBtn = document.getElementById("play-pause-btn");
    setupTimelineListeners();
    setupPlayPauseButton();
    window.addEventListener('hashchange', onhashchange);
    window.onbeforeunload = savePosition;
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
    }
    else {
        clearInterval(savingTimer);
    }
}
function savePosition() {
    if (!player?.getVideoUrl)
        return;
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
function getPosition() {
    if (!player)
        return 0;
    const vid = extractYouTubeId(player.getVideoUrl());
    if (!vid)
        return 0;
    return Number(localStorage.getItem("vid-" + vid)) || 0;
}
function updateTimeline() {
    if (!player || !timeline || !timelineTimeSpan || !timelineDragSpan || !timelineApplyBtn || !timelineCancelBtn)
        return;
    const duration = player.getDuration();
    const current = player.getCurrentTime();
    if (duration > 0) {
        timeline.max = String(Math.floor(duration));
        if (!timelineDragging) {
            timeline.value = String(Math.floor(current));
        }
        timelineTimeSpan.textContent = formatTime(current) + " / " + formatTime(duration);
        timelineTimeSpan.style.color = "#ccc";
        if (timelineDragging) {
            timelineDragSpan.textContent = formatTime(dragValue);
            timelineDragSpan.style.display = "";
            timelineApplyBtn.style.display = "";
            timelineCancelBtn.style.display = "";
        }
        else {
            timelineDragSpan.textContent = "";
            timelineDragSpan.style.display = "none";
            timelineApplyBtn.style.display = "none";
            timelineCancelBtn.style.display = "none";
        }
    }
    else {
        timelineTimeSpan.textContent = "--:-- / --:--";
        timelineTimeSpan.style.color = "#ccc";
        timelineDragSpan.textContent = "";
        timelineDragSpan.style.display = "none";
        timelineApplyBtn.style.display = "none";
        timelineCancelBtn.style.display = "none";
    }
}
function setupTimelineListeners() {
    if (!timeline || !timelineApplyBtn || !timelineCancelBtn)
        return;
    timeline.addEventListener("input", function () {
        timelineDragging = true;
        dragValue = Number(timeline.value);
        updateTimeline();
    });
    timeline.addEventListener("change", function () {
        dragValue = Number(timeline.value);
        updateTimeline();
    });
    timelineApplyBtn.onclick = function () {
        if (player?.seekTo) {
            player.seekTo(Number(dragValue), true);
        }
        timelineDragging = false;
        updateTimeline();
    };
    timelineCancelBtn.onclick = function () {
        timelineDragging = false;
        updateTimeline();
    };
}
function updatePlayPauseButton() {
    if (!playPauseBtn)
        return;
    if (currentPlayerState === 1) {
        playPauseBtn.textContent = "Pause";
        playPauseBtn.style.color = "#ff6b6b";
        playPauseBtn.onmouseout = function () {
            playPauseBtn.style.background = '#232323';
            playPauseBtn.style.color = '#ff6b6b';
        };
    }
    else {
        playPauseBtn.textContent = "Play";
        playPauseBtn.style.color = "#6cf06c";
        playPauseBtn.onmouseout = function () {
            playPauseBtn.style.background = '#232323';
            playPauseBtn.style.color = '#6cf06c';
        };
    }
}
function setupPlayPauseButton() {
    if (!playPauseBtn)
        return;
    playPauseBtn.onclick = function () {
        if (!player)
            return;
        const state = player.getPlayerState();
        if (state === 1) {
            player.pauseVideo();
        }
        else {
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
    if (!player)
        return;
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
    }
    else {
        setTimeout(() => {
            startSeek(retryDelay * 2);
        }, retryDelay);
    }
}
export async function apply_vid(vid) {
    console.log("apply_vid", vid);
    if (vid && player) {
        const parsedUrlContainer = document.getElementById("parsed-url-container");
        const parsedUrlInput = document.getElementById("parsed-url");
        const fullUrl = `https://www.youtube.com/watch?v=${vid}`;
        if (parsedUrlInput)
            parsedUrlInput.value = fullUrl;
        if (parsedUrlContainer)
            parsedUrlContainer.style.display = "block";
        const checklistItemId = await isVideoInWatchLater(vid);
        const wasWatchLater = checklistItemId !== null;
        isInitialSeek = true;
        player.loadVideoById(vid);
        startSeek(100);
        setTimeout(async () => {
            if (!player)
                return;
            const videoData = player.getVideoData();
            try {
                const details = await resolveChannelDetails(videoData.video_id);
                if (details?.author_url)
                    videoData.author_url = details.author_url;
            }
            catch {
                // ignore
            }
            const savedPosition = localStorage.getItem("vid-" + videoData.video_id);
            const currentTime = savedPosition ? parseFloat(savedPosition) : 0;
            const duration = player.getDuration() || 0;
            const progress = duration > 0 ? { currentTime, duration, percentage: (currentTime / duration) * 100 } : null;
            addToHistory(videoData, document.title, wasWatchLater, progress);
            if (checklistItemId) {
                await removeFromWatchLater(checklistItemId, null);
                await loadWatchLater();
            }
        }, 2000);
    }
}
export function apply_input_vid(str) {
    const video_id = extractYouTubeId(str);
    if (video_id) {
        const timestamp = extractTimestamp(str);
        if (timestamp !== null) {
            localStorage.setItem("vid-" + video_id, String(timestamp));
        }
        window.location.hash = "#" + video_id;
    }
}
export function select_input_vid() {
    const input_vid = document.getElementById("input_vid");
    console.log("select_input_vid");
    if (!input_vid)
        return;
    input_vid.value = "";
    navigator.clipboard.readText()
        .then(text => {
        input_vid.value = text;
        apply_input_vid(text);
    });
}
export function apply_input_vid_from_button() {
    const input_vid = document.getElementById("input_vid");
    const str = input_vid?.value;
    if (str) {
        apply_input_vid(str);
    }
}
