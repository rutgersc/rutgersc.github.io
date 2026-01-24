export function extractYouTubeId(input) {
    try {
        if (/^[\w-]{11}$/.test(input)) {
            return input;
        }
        const url = new URL(input);
        if (url.hostname === 'www.youtube.com' ||
            url.hostname === 'm.youtube.com') {
            const liveMatch = url.pathname.match(/^\/live\/([\w-]{11})/);
            if (liveMatch) {
                return liveMatch[1];
            }
            return url.searchParams.get('v');
        }
        if (url.hostname === 'youtu.be') {
            return url.pathname.slice(1);
        }
    }
    catch {
        // input is not a valid URL; fall through
    }
    return null;
}
export function extractTimestamp(input) {
    try {
        const url = new URL(input);
        const tParam = url.searchParams.get('t');
        if (tParam) {
            return parseInt(tParam.replace(/s$/i, ''));
        }
    }
    catch {
        // input is not a valid URL
    }
    return null;
}
export function formatTime(sec) {
    sec = Math.floor(sec);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
        return h + ":" + (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
    }
    else {
        return m + ":" + (s < 10 ? "0" : "") + s;
    }
}
export function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    if (diffSeconds < 60)
        return "just now";
    if (diffMinutes < 60)
        return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    if (diffHours < 24)
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7)
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    if (diffWeeks < 4)
        return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
    if (diffMonths < 12)
        return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
    return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
}
export async function resolveChannelDetails(videoId) {
    try {
        const cacheKey = `channelDetails:${videoId}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached)
            return JSON.parse(cached);
        const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
        if (res.ok) {
            const data = await res.json();
            const author_url = data.author_url || null;
            const result = { author_url };
            localStorage.setItem(cacheKey, JSON.stringify(result));
            return result;
        }
    }
    catch (e) {
        console.warn("resolveChannelDetails error", e);
    }
    return { author_url: null };
}
function extractChannelId(authorUrl, authorId) {
    if (authorId)
        return authorId;
    if (!authorUrl)
        return null;
    const channelMatch = authorUrl.match(/\/channel\/(UC[\w-]+)/);
    if (channelMatch)
        return channelMatch[1];
    const userMatch = authorUrl.match(/\/@([\w-]+)/);
    if (userMatch)
        return `@${userMatch[1]}`;
    return null;
}
export async function fetchChannelVideos(authorUrl, authorId, limit = 10) {
    const channelId = extractChannelId(authorUrl, authorId);
    if (!channelId)
        return [];
    const cacheKey = `channelVideos:${channelId}`;
    const cacheExpiry = 30 * 60 * 1000; // 30 minutes
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        const { videos, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < cacheExpiry) {
            return videos.slice(0, limit);
        }
    }
    const isHandle = channelId.startsWith('@');
    const feedUrl = isHandle
        ? `https://www.youtube.com/feeds/videos.xml?user=${channelId.slice(1)}`
        : `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok)
        throw new Error(`Failed to fetch channel feed: ${res.status}`);
    const xml = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const entries = doc.querySelectorAll('entry');
    const videos = Array.from(entries).map(entry => {
        const videoIdEl = entry.querySelector('yt\\:videoId, videoId');
        const titleEl = entry.querySelector('title');
        const publishedEl = entry.querySelector('published');
        return {
            videoId: videoIdEl?.textContent ?? '',
            title: titleEl?.textContent ?? 'Unknown',
            published: publishedEl?.textContent ?? ''
        };
    }).filter(v => v.videoId);
    localStorage.setItem(cacheKey, JSON.stringify({ videos, timestamp: Date.now() }));
    return videos.slice(0, limit);
}
