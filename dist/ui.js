import { getTimeAgo, formatTime, fetchChannelVideos } from './video-utils.js';
import { apply_input_vid } from './youtube-player.js';
import { getWatchedVideosIndex } from './history.js';
import { channelKey, getIgnoredChannels, setChannelIgnored } from './feed.js';
export function renderXItem(postId, dateViewed, onRemove) {
    const url = `https://x.com/i/status/${postId}`;
    const item = document.createElement('li');
    item.className = 'x-list-item';
    const link = document.createElement('a');
    link.href = url;
    link.textContent = `X post ${postId}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    item.append(link);
    if (dateViewed) {
        const date = document.createElement('span');
        date.textContent = getTimeAgo(new Date(dateViewed));
        item.append(date);
    }
    const play = document.createElement('button');
    play.textContent = 'Play';
    play.onclick = () => apply_input_vid(url);
    item.append(play);
    if (onRemove) {
        const remove = document.createElement('button');
        remove.textContent = 'Remove';
        remove.onclick = onRemove;
        item.append(remove);
    }
    return item;
}
const renderProgressBar = (currentTime, duration, percentage) => {
    const bar = document.createElement("div");
    bar.style.width = "100%";
    bar.style.marginTop = "6px";
    bar.style.marginBottom = "4px";
    const container = document.createElement("div");
    container.style.width = "100%";
    container.style.height = "8px";
    container.style.background = "#1a1a1a";
    container.style.borderRadius = "4px";
    container.style.overflow = "hidden";
    container.style.border = "1px solid #333";
    const fill = document.createElement("div");
    fill.style.width = `${Math.min(percentage, 100)}%`;
    fill.style.height = "100%";
    fill.style.background = percentage >= 90 ? "#52b788" : "#ffd166";
    fill.style.transition = "width 0.3s ease";
    container.appendChild(fill);
    const text = document.createElement("div");
    text.style.fontSize = "0.75rem";
    text.style.color = "#aaa";
    text.style.marginTop = "2px";
    text.textContent = `${formatTime(currentTime)} / ${formatTime(duration)} (${Math.round(percentage)}%)`;
    bar.appendChild(container);
    bar.appendChild(text);
    return bar;
};
export const SHORTS_MAX_SECONDS = 60 * 3;
export const renderChannelVideoItem = (video, watchedIndex) => {
    const isWatched = watchedIndex.has(video.videoId);
    const isShort = video.durationSeconds != null && video.durationSeconds <= SHORTS_MAX_SECONDS;
    const item = document.createElement("div");
    item.style.display = "flex";
    item.style.flexDirection = "column";
    item.style.padding = "6px 0";
    item.style.borderBottom = "1px solid #333";
    if (isShort)
        item.style.opacity = "0.45";
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    const info = document.createElement("div");
    info.style.flex = "1";
    info.style.minWidth = "0";
    info.style.marginRight = "10px";
    const title = document.createElement("div");
    title.style.color = "#fff";
    title.style.fontSize = "0.85rem";
    title.style.whiteSpace = "nowrap";
    title.style.overflow = "hidden";
    title.style.textOverflow = "ellipsis";
    title.style.marginBottom = "2px";
    title.title = video.title;
    if (isWatched) {
        const check = document.createElement("span");
        check.textContent = "✓ ";
        check.style.color = "#52b788";
        title.appendChild(check);
        title.appendChild(document.createTextNode(video.title));
    }
    else {
        title.textContent = video.title;
    }
    const meta = document.createElement("div");
    meta.style.color = "#888";
    meta.style.fontSize = "0.75rem";
    meta.style.display = "flex";
    meta.style.gap = "8px";
    if (video.published) {
        const date = document.createElement("span");
        date.textContent = getTimeAgo(new Date(video.published));
        meta.appendChild(date);
    }
    if (video.durationSeconds != null) {
        const dur = document.createElement("span");
        dur.textContent = formatTime(video.durationSeconds);
        dur.style.color = "#8ecae6";
        meta.appendChild(dur);
    }
    if (isShort) {
        const shortTag = document.createElement("span");
        shortTag.textContent = "Short";
        shortTag.style.fontStyle = "italic";
        meta.appendChild(shortTag);
    }
    info.appendChild(title);
    info.appendChild(meta);
    const playBtn = document.createElement("button");
    playBtn.textContent = "▶️";
    playBtn.title = "Play";
    playBtn.style.background = "#2d6a4f";
    playBtn.style.color = "#fff";
    playBtn.style.border = "none";
    playBtn.style.borderRadius = "4px";
    playBtn.style.padding = "4px 8px";
    playBtn.style.cursor = "pointer";
    playBtn.style.fontSize = "0.9em";
    playBtn.style.flexShrink = "0";
    playBtn.onmouseenter = () => playBtn.style.background = "#40916c";
    playBtn.onmouseleave = () => playBtn.style.background = "#2d6a4f";
    playBtn.onclick = () => apply_input_vid(video.videoId);
    row.appendChild(info);
    row.appendChild(playBtn);
    item.appendChild(row);
    if (isWatched) {
        const saved = localStorage.getItem("vid-" + video.videoId);
        if (saved && video.durationSeconds) {
            const currentTime = parseFloat(saved);
            if (currentTime > 0) {
                const percentage = (currentTime / video.durationSeconds) * 100;
                item.appendChild(renderProgressBar(currentTime, video.durationSeconds, percentage));
            }
        }
    }
    return item;
};
const CHANNEL_VIDEO_PAGE = 10;
const renderChannelVideoList = (container, videos, watchedIndex) => {
    const moreBtn = document.createElement("button");
    moreBtn.style.cssText = "display:block;width:100%;margin-top:8px;padding:8px;background:#2a2a2a;color:#8ecae6;border:1px solid #333;border-radius:6px;cursor:pointer;font-size:0.85rem;";
    let shown = 0;
    const showNext = () => {
        videos.slice(shown, shown + CHANNEL_VIDEO_PAGE).forEach(v => container.insertBefore(renderChannelVideoItem(v, watchedIndex), moreBtn));
        shown = Math.min(shown + CHANNEL_VIDEO_PAGE, videos.length);
        if (shown >= videos.length)
            moreBtn.remove();
        else
            moreBtn.textContent = `Load more (${videos.length - shown})`;
    };
    moreBtn.onclick = showNext;
    container.appendChild(moreBtn);
    showNext();
};
export const renderLatestChannelVideos = (author_url, author_id) => {
    const container = document.createElement("div");
    container.style.cssText = "display:none;width:100%;margin-top:6px;padding:8px 10px;background:#1c1c1c;border:1px solid #333;border-radius:6px;box-sizing:border-box;";
    const status = document.createElement("div");
    status.style.cssText = "color:#bbb;font-size:0.9rem;";
    status.textContent = "Loading channel videos...";
    container.appendChild(status);
    let fetched = false;
    const load = async () => {
        fetched = true;
        try {
            const videos = await fetchChannelVideos(author_url, author_id, 50);
            if (videos.length === 0) {
                status.textContent = "No videos found for this channel.";
                return;
            }
            status.remove();
            renderChannelVideoList(container, videos, getWatchedVideosIndex());
        }
        catch (e) {
            console.warn("Failed to fetch channel videos", e);
            status.textContent = "Failed to load channel videos.";
        }
    };
    const toggle = () => {
        const open = container.style.display === "none";
        container.style.display = open ? "block" : "none";
        if (open && !fetched)
            void load();
        return open;
    };
    return { container, toggle };
};
const makeHeaderToggle = (label, title) => {
    const btn = document.createElement("button");
    btn.title = title;
    btn.style.cssText = "background:#3a3a3a;color:#fff;border:none;border-radius:4px;padding:3px 8px;cursor:pointer;font-size:0.8rem;margin-left:6px;white-space:nowrap;";
    const setOpen = (open) => {
        btn.textContent = `${label} ${open ? "▴" : "▾"}`;
        btn.style.background = open ? "#4a5568" : "#3a3a3a";
    };
    setOpen(false);
    return { btn, setOpen };
};
export function renderVideoItem(videoData, dateViewed, options = {}) {
    const { onRemove = null, removeButtonText = '🗑️', removeButtonTitle = 'Remove', onPlay = null, wasWatchLater = false, playUrl = null, onFix = null, progress = null } = options;
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
    listItem.style.border = wasWatchLater ? "1px solid #ffd166" : "1px solid #333";
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
    if (videoData.author_url) {
        authorP.href = videoData.author_url;
    }
    else if (videoData.author_id) {
        authorP.href = `https://www.youtube.com/channel/${videoData.author_id}`;
    }
    else {
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
    const idP = document.createElement("a");
    idP.textContent = videoData.video_id;
    idP.style.fontSize = "0.85rem";
    idP.style.color = "#bdbdbd";
    idP.style.fontFamily = "monospace";
    idP.style.marginLeft = "12px";
    idP.style.cursor = "pointer";
    idP.style.textDecoration = "none";
    idP.title = "Open video in new tab";
    const timestampParam = videoData.timestamp ? `&t=${videoData.timestamp}` : '';
    idP.href = `https://www.youtube.com/watch?v=${videoData.video_id}${timestampParam}`;
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
    const videoTimestampSpan = document.createElement("span");
    if (videoData.timestamp) {
        videoTimestampSpan.textContent = `@${formatTime(videoData.timestamp)}`;
        videoTimestampSpan.style.fontSize = "0.8rem";
        videoTimestampSpan.style.color = "#ffd166";
        videoTimestampSpan.style.fontStyle = "italic";
        videoTimestampSpan.style.marginLeft = "8px";
        videoTimestampSpan.title = `Video will start at ${formatTime(videoData.timestamp)}`;
    }
    const dateViewedSpan = document.createElement("span");
    if (dateViewed) {
        const date = new Date(dateViewed);
        const timeAgo = getTimeAgo(date);
        dateViewedSpan.textContent = timeAgo;
        dateViewedSpan.style.fontSize = "0.8rem";
        dateViewedSpan.style.color = "#888";
        dateViewedSpan.style.fontStyle = "italic";
        dateViewedSpan.style.marginLeft = "12px";
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
        apply_input_vid(playUrl || videoData.video_id);
    };
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
        const btn = removeButton;
        removeButton.onmouseenter = () => btn.style.background = "#a00000";
        removeButton.onmouseleave = () => btn.style.background = "#8b0000";
        removeButton.onclick = () => onRemove(videoData.video_id);
    }
    let fixButton = null;
    if (!videoData.title && onFix) {
        fixButton = document.createElement("button");
        fixButton.textContent = "🔧";
        fixButton.title = "Fetch title/author from noembed";
        fixButton.style.cssText = "background:#4a5568;color:#fff;border:none;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:1.1em;margin-left:8px;";
        fixButton.onclick = () => onFix();
    }
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
    const leftGroup = document.createElement("span");
    leftGroup.style.display = "flex";
    leftGroup.style.alignItems = "center";
    leftGroup.appendChild(authorP);
    leftGroup.appendChild(idP);
    if (videoData.timestamp) {
        leftGroup.appendChild(videoTimestampSpan);
    }
    if (dateViewed) {
        leftGroup.appendChild(dateViewedSpan);
    }
    topRow.appendChild(leftGroup);
    const rightGroup = document.createElement("span");
    rightGroup.appendChild(playButton);
    if (removeButton)
        rightGroup.appendChild(removeButton);
    if (fixButton)
        rightGroup.appendChild(fixButton);
    rightGroup.appendChild(expandBtn);
    topRow.appendChild(rightGroup);
    const titleP = document.createElement("span");
    titleP.textContent = videoData.title;
    titleP.style.fontSize = "1.05rem";
    titleP.style.fontWeight = "500";
    titleP.style.color = "#fff";
    titleP.style.marginTop = "2px";
    titleP.style.marginBottom = "2px";
    titleP.style.wordBreak = "break-word";
    const progressBar = (progress && progress.percentage !== undefined)
        ? renderProgressBar(progress.currentTime, progress.duration, progress.percentage)
        : null;
    const latest = renderLatestChannelVideos(videoData.author_url, videoData.author_id);
    const expandContainer = latest.container;
    expandBtn.onclick = () => {
        const open = latest.toggle();
        expandBtn.textContent = open ? "▴" : "▾";
        expandBtn.title = open ? "Collapse" : "Expand channel videos";
    };
    listItem.appendChild(topRow);
    listItem.appendChild(titleP);
    if (progressBar) {
        listItem.appendChild(progressBar);
    }
    listItem.appendChild(expandContainer);
    return listItem;
}
export function renderChannelGroups(channels) {
    const section = document.createElement("div");
    section.style.background = "#1a1a1a";
    section.style.borderRadius = "8px";
    section.style.margin = "12px auto";
    section.style.padding = "16px";
    section.style.maxWidth = "480px";
    section.style.boxShadow = "0 2px 8px rgba(0,0,0,0.12)";
    section.style.border = "2px solid #4a5568";
    const watchedIndex = getWatchedVideosIndex();
    channels.forEach(channel => {
        const channelItem = document.createElement("div");
        channelItem.style.marginBottom = "12px";
        channelItem.style.background = "#232323";
        channelItem.style.borderRadius = "6px";
        channelItem.style.padding = "10px";
        channelItem.style.border = "1px solid #333";
        const channelHeader = document.createElement("div");
        channelHeader.style.display = "flex";
        channelHeader.style.justifyContent = "space-between";
        channelHeader.style.alignItems = "center";
        channelHeader.style.cursor = "pointer";
        const channelName = document.createElement("a");
        channelName.textContent = channel.author;
        channelName.style.color = "#8ecae6";
        channelName.style.fontWeight = "bold";
        channelName.style.fontSize = "1rem";
        channelName.style.textDecoration = "none";
        if (channel.author_url) {
            channelName.href = channel.author_url;
        }
        else if (channel.author_id) {
            channelName.href = `https://www.youtube.com/channel/${channel.author_id}`;
        }
        else {
            channelName.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(channel.author)}`;
        }
        channelName.target = "_blank";
        channelName.rel = "noopener noreferrer";
        channelName.onmouseenter = () => {
            channelName.style.textDecoration = "underline";
            channelName.style.color = "#ffd166";
        };
        channelName.onmouseleave = () => {
            channelName.style.textDecoration = "none";
            channelName.style.color = "#8ecae6";
        };
        const videoCount = document.createElement("span");
        videoCount.textContent = `${channel.videos.length} watched`;
        videoCount.style.color = "#bbb";
        videoCount.style.fontSize = "0.9rem";
        videoCount.style.marginLeft = "12px";
        const leftSide = document.createElement("div");
        leftSide.style.display = "flex";
        leftSide.style.alignItems = "center";
        leftSide.style.minWidth = "0";
        leftSide.appendChild(channelName);
        leftSide.appendChild(videoCount);
        const watchedToggle = makeHeaderToggle("Watched", "Videos you watched from this channel");
        const latestToggle = makeHeaderToggle("Latest", "Latest uploads of this channel");
        const feedTag = document.createElement("span");
        feedTag.textContent = "not in feed";
        feedTag.style.cssText = "color:#e76f51;font-size:0.75rem;font-style:italic;margin-left:8px;";
        const ignoreBtn = document.createElement("button");
        ignoreBtn.style.cssText = "background:#3a3a3a;color:#fff;border:none;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:0.9em;margin-left:8px;";
        const applyIgnored = (ignored) => {
            ignoreBtn.textContent = ignored ? "👁" : "🚫";
            ignoreBtn.title = ignored ? "Show in feed" : "Hide from feed";
            channelName.style.opacity = ignored ? "0.5" : "1";
            feedTag.style.display = ignored ? "inline" : "none";
        };
        ignoreBtn.onclick = () => {
            const ignored = !getIgnoredChannels().has(channelKey(channel));
            setChannelIgnored(channelKey(channel), ignored);
            applyIgnored(ignored);
        };
        applyIgnored(getIgnoredChannels().has(channelKey(channel)));
        leftSide.appendChild(feedTag);
        const rightSide = document.createElement("div");
        rightSide.style.display = "flex";
        rightSide.style.alignItems = "center";
        rightSide.appendChild(watchedToggle.btn);
        rightSide.appendChild(latestToggle.btn);
        rightSide.appendChild(ignoreBtn);
        channelHeader.appendChild(leftSide);
        channelHeader.appendChild(rightSide);
        const videosContainer = document.createElement("div");
        videosContainer.style.display = "none";
        videosContainer.style.marginTop = "10px";
        videosContainer.style.paddingTop = "10px";
        videosContainer.style.borderTop = "1px solid #333";
        channel.videos
            .map(video => renderChannelVideoItem({
            videoId: video.videoData.video_id,
            title: video.videoData.title,
            published: video.dateViewed,
            durationSeconds: video.progress?.duration ?? null
        }, watchedIndex))
            .forEach(item => videosContainer.appendChild(item));
        const toggleWatched = () => {
            const open = videosContainer.style.display === "none";
            videosContainer.style.display = open ? "block" : "none";
            watchedToggle.setOpen(open);
        };
        watchedToggle.btn.onclick = toggleWatched;
        channelHeader.onclick = (e) => {
            if (e.target === channelName || e.target.closest?.("button"))
                return;
            toggleWatched();
        };
        const latest = renderLatestChannelVideos(channel.author_url, channel.author_id);
        latestToggle.btn.onclick = () => latestToggle.setOpen(latest.toggle());
        channelItem.appendChild(channelHeader);
        channelItem.appendChild(videosContainer);
        channelItem.appendChild(latest.container);
        section.appendChild(channelItem);
    });
    return section;
}
export function initViewportManager() {
    const switchWidthBtn = document.getElementById("switch-width-btn");
    const ytplayer = document.getElementById("ytplayer");
    const timeline = document.getElementById("timeline");
    const timelineTime = document.getElementById("timeline-time");
    const timelineControls = document.getElementById("timeline-controls");
    const chaptersContainer = document.getElementById("chapters-container");
    if (!switchWidthBtn || !ytplayer || !timeline || !timelineTime)
        return;
    let isFullWidth = true;
    const handleViewportChange = () => setFullWidth(false);
    function setFullWidth(full) {
        if (!ytplayer || !timeline || !timelineTime || !switchWidthBtn)
            return;
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
            if (timelineControls) {
                timelineControls.style.position = "";
                timelineControls.style.left = "";
                timelineControls.style.width = "";
            }
            if (chaptersContainer) {
                chaptersContainer.style.position = "";
                chaptersContainer.style.left = "";
                chaptersContainer.style.width = "";
            }
            switchWidthBtn.textContent = "Viewport";
        }
        else {
            const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
            const container = ytplayer.parentElement;
            const containerLeft = container ? container.getBoundingClientRect().left + window.scrollX : 0;
            const viewportLeft = (window.visualViewport?.pageLeft ?? window.scrollX) - containerLeft;
            ytplayer.style.width = viewportWidth + "px";
            timeline.style.width = viewportWidth + "px";
            ytplayer.style.position = "relative";
            ytplayer.style.left = viewportLeft + "px";
            ytplayer.style.margin = "0";
            timeline.style.position = "relative";
            timeline.style.left = viewportLeft + "px";
            timeline.style.margin = "10px 0";
            timelineTime.style.position = "relative";
            timelineTime.style.left = viewportLeft + "px";
            timelineTime.style.width = viewportWidth + "px";
            if (timelineControls) {
                timelineControls.style.position = "relative";
                timelineControls.style.left = viewportLeft + "px";
                timelineControls.style.width = viewportWidth + "px";
            }
            if (chaptersContainer) {
                chaptersContainer.style.position = "relative";
                chaptersContainer.style.left = viewportLeft + "px";
                chaptersContainer.style.width = viewportWidth + "px";
            }
            switchWidthBtn.textContent = "Full";
        }
        isFullWidth = full;
    }
    switchWidthBtn.onclick = function () {
        const newFullWidth = !isFullWidth;
        setFullWidth(newFullWidth);
        if (newFullWidth) {
            window.visualViewport?.removeEventListener("resize", handleViewportChange);
            window.visualViewport?.removeEventListener("scroll", handleViewportChange);
        }
        else {
            window.visualViewport?.addEventListener("resize", handleViewportChange);
            window.visualViewport?.addEventListener("scroll", handleViewportChange);
        }
    };
    setFullWidth(true);
    if (window.matchMedia("(pointer: coarse)").matches) {
        window.scrollTo({ left: parseFloat(getComputedStyle(document.body).paddingLeft) || 0, top: window.scrollY });
    }
}
