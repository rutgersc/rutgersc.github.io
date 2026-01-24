import { getTimeAgo, formatTime, fetchChannelVideos } from './video-utils.js';
import { apply_input_vid } from './youtube-player.js';
export function renderVideoItem(videoData, dateViewed, options = {}) {
    const { onRemove = null, removeButtonText = '🗑️', removeButtonTitle = 'Remove', onPlay = null, wasWatchLater = false, playUrl = null, onCompact = null, showCompactButton = false, progress = null } = options;
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
    let compactButton = null;
    if (showCompactButton && onCompact) {
        compactButton = document.createElement("button");
        compactButton.textContent = "📦";
        compactButton.title = "Compact history up to this point";
        compactButton.style.background = "#4a5568";
        compactButton.style.color = "#fff";
        compactButton.style.border = "none";
        compactButton.style.borderRadius = "4px";
        compactButton.style.padding = "4px 10px";
        compactButton.style.cursor = "pointer";
        compactButton.style.fontSize = "1.1em";
        compactButton.style.marginLeft = "8px";
        const btn = compactButton;
        compactButton.onmouseenter = () => btn.style.background = "#5a6678";
        compactButton.onmouseleave = () => btn.style.background = "#4a5568";
        compactButton.onclick = () => onCompact();
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
    if (compactButton)
        rightGroup.appendChild(compactButton);
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
    let progressBar = null;
    if (progress && progress.percentage !== undefined) {
        progressBar = document.createElement("div");
        progressBar.style.width = "100%";
        progressBar.style.marginTop = "6px";
        progressBar.style.marginBottom = "4px";
        const progressBarContainer = document.createElement("div");
        progressBarContainer.style.width = "100%";
        progressBarContainer.style.height = "8px";
        progressBarContainer.style.background = "#1a1a1a";
        progressBarContainer.style.borderRadius = "4px";
        progressBarContainer.style.overflow = "hidden";
        progressBarContainer.style.border = "1px solid #333";
        const progressBarFill = document.createElement("div");
        progressBarFill.style.width = `${Math.min(progress.percentage, 100)}%`;
        progressBarFill.style.height = "100%";
        progressBarFill.style.background = progress.percentage >= 90 ? "#52b788" : "#ffd166";
        progressBarFill.style.transition = "width 0.3s ease";
        progressBarContainer.appendChild(progressBarFill);
        const progressText = document.createElement("div");
        progressText.style.fontSize = "0.75rem";
        progressText.style.color = "#aaa";
        progressText.style.marginTop = "2px";
        progressText.textContent = `${formatTime(progress.currentTime)} / ${formatTime(progress.duration)} (${Math.round(progress.percentage)}%)`;
        progressBar.appendChild(progressBarContainer);
        progressBar.appendChild(progressText);
    }
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
    let channelVideosFetched = false;
    async function toggleExpand() {
        const isOpen = expandContainer.style.display !== "none";
        if (isOpen) {
            expandContainer.style.display = "none";
            expandBtn.textContent = "▾";
            expandBtn.title = "Expand channel videos";
            return;
        }
        expandContainer.style.display = "block";
        expandBtn.textContent = "▴";
        expandBtn.title = "Collapse";
        if (channelVideosFetched)
            return;
        expandStatus.textContent = "Loading channel videos...";
        try {
            const videos = await fetchChannelVideos(videoData.author_url, videoData.author_id, 10);
            if (videos.length === 0) {
                expandStatus.textContent = "No videos found for this channel.";
                channelVideosFetched = true;
                return;
            }
            expandStatus.style.display = "none";
            channelVideosFetched = true;
            const renderChannelVideoItem = (video) => {
                const item = document.createElement("div");
                item.style.display = "flex";
                item.style.alignItems = "center";
                item.style.justifyContent = "space-between";
                item.style.padding = "6px 0";
                item.style.borderBottom = "1px solid #333";
                const info = document.createElement("div");
                info.style.flex = "1";
                info.style.minWidth = "0";
                info.style.marginRight = "10px";
                const title = document.createElement("div");
                title.textContent = video.title;
                title.style.color = "#fff";
                title.style.fontSize = "0.85rem";
                title.style.whiteSpace = "nowrap";
                title.style.overflow = "hidden";
                title.style.textOverflow = "ellipsis";
                title.style.marginBottom = "2px";
                title.title = video.title;
                const date = document.createElement("div");
                date.textContent = video.published ? getTimeAgo(new Date(video.published)) : "";
                date.style.color = "#888";
                date.style.fontSize = "0.75rem";
                info.appendChild(title);
                info.appendChild(date);
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
                item.appendChild(info);
                item.appendChild(playBtn);
                return item;
            };
            videos.forEach(video => expandContainer.appendChild(renderChannelVideoItem(video)));
        }
        catch (e) {
            console.warn("Failed to fetch channel videos", e);
            expandStatus.textContent = "Failed to load channel videos.";
            channelVideosFetched = true;
        }
    }
    expandBtn.onclick = toggleExpand;
    listItem.appendChild(topRow);
    listItem.appendChild(titleP);
    if (progressBar) {
        listItem.appendChild(progressBar);
    }
    listItem.appendChild(expandContainer);
    return listItem;
}
export function renderCompactedSection(compacted) {
    const section = document.createElement("div");
    section.style.background = "#1a1a1a";
    section.style.borderRadius = "8px";
    section.style.margin = "12px auto";
    section.style.padding = "16px";
    section.style.maxWidth = "480px";
    section.style.boxShadow = "0 2px 8px rgba(0,0,0,0.12)";
    section.style.border = "2px solid #4a5568";
    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.style.marginBottom = "12px";
    const title = document.createElement("h4");
    title.textContent = "Compacted History";
    title.style.color = "#8ecae6";
    title.style.margin = "0";
    title.style.fontSize = "1.1rem";
    const compactedDate = document.createElement("span");
    compactedDate.textContent = getTimeAgo(new Date(compacted.compactedAt));
    compactedDate.style.color = "#888";
    compactedDate.style.fontSize = "0.85rem";
    compactedDate.style.fontStyle = "italic";
    header.appendChild(title);
    header.appendChild(compactedDate);
    section.appendChild(header);
    compacted.channels.forEach(channel => {
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
        videoCount.textContent = `${channel.videos.length} video${channel.videos.length !== 1 ? 's' : ''}`;
        videoCount.style.color = "#bbb";
        videoCount.style.fontSize = "0.9rem";
        videoCount.style.marginLeft = "12px";
        const toggleIcon = document.createElement("span");
        toggleIcon.textContent = "▾";
        toggleIcon.style.color = "#bbb";
        toggleIcon.style.fontSize = "1.2rem";
        const leftSide = document.createElement("div");
        leftSide.style.display = "flex";
        leftSide.style.alignItems = "center";
        leftSide.appendChild(channelName);
        leftSide.appendChild(videoCount);
        channelHeader.appendChild(leftSide);
        channelHeader.appendChild(toggleIcon);
        const videosContainer = document.createElement("div");
        videosContainer.style.display = "none";
        videosContainer.style.marginTop = "10px";
        videosContainer.style.paddingTop = "10px";
        videosContainer.style.borderTop = "1px solid #333";
        channel.videos.forEach(video => {
            const videoLine = document.createElement("div");
            videoLine.style.display = "flex";
            videoLine.style.alignItems = "center";
            videoLine.style.justifyContent = "space-between";
            videoLine.style.padding = "6px 0";
            videoLine.style.fontSize = "0.9rem";
            videoLine.style.borderBottom = "1px solid #2a2a2a";
            const videoInfo = document.createElement("div");
            videoInfo.style.display = "flex";
            videoInfo.style.flexDirection = "column";
            videoInfo.style.flex = "1";
            videoInfo.style.marginRight = "10px";
            videoInfo.style.minWidth = "0";
            const videoTitle = document.createElement("div");
            videoTitle.textContent = video.videoData.title;
            videoTitle.style.color = "#fff";
            videoTitle.style.fontSize = "0.85rem";
            videoTitle.style.whiteSpace = "nowrap";
            videoTitle.style.overflow = "hidden";
            videoTitle.style.textOverflow = "ellipsis";
            videoTitle.style.marginBottom = "2px";
            const videoDate = document.createElement("div");
            videoDate.textContent = getTimeAgo(new Date(video.dateViewed));
            videoDate.style.color = "#888";
            videoDate.style.fontSize = "0.75rem";
            videoInfo.appendChild(videoTitle);
            videoInfo.appendChild(videoDate);
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
            playBtn.onclick = () => apply_input_vid(video.videoData.video_id);
            videoLine.appendChild(videoInfo);
            videoLine.appendChild(playBtn);
            videosContainer.appendChild(videoLine);
        });
        channelHeader.onclick = (e) => {
            if (e.target === channelName)
                return;
            const isHidden = videosContainer.style.display === "none";
            videosContainer.style.display = isHidden ? "block" : "none";
            toggleIcon.textContent = isHidden ? "▴" : "▾";
        };
        channelItem.appendChild(channelHeader);
        channelItem.appendChild(videosContainer);
        section.appendChild(channelItem);
    });
    return section;
}
export function initViewportManager() {
    const switchWidthBtn = document.getElementById("switch-width-btn");
    const ytplayer = document.getElementById("ytplayer");
    const timeline = document.getElementById("timeline");
    const timelineTime = document.getElementById("timeline-time");
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
            switchWidthBtn.textContent = "Viewport";
        }
        else {
            const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
            const viewportLeft = window.visualViewport?.offsetLeft ?? 0;
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
}
