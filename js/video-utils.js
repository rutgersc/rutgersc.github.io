export function extractYouTubeId(input) {
  try {
    // If it's already a plain video ID
    if (/^[\w-]{11}$/.test(input)) {
      return input;
    }

    const url = new URL(input);

    // Handle full or mobile YouTube URL
    if (
      url.hostname === 'www.youtube.com' ||
      url.hostname === 'm.youtube.com'
    ) {
      // Handle /live/ URLs (e.g., /live/DmiExfHEJZM)
      const liveMatch = url.pathname.match(/^\/live\/([\w-]{11})/);
      if (liveMatch) {
        return liveMatch[1];
      }

      return url.searchParams.get('v');
    }

    // Handle youtu.be short URL
    if (url.hostname === 'youtu.be') {
      return url.pathname.slice(1); // remove leading '/'
    }

  } catch (e) {
    // input is not a valid URL; fall through
  }

  return null; // couldn't extract ID
}

export function formatTime(sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return h + ":" + (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  } else {
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

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
  if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
  return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
}

export async function resolveChannelDetails(videoId) {
  try {
    const cacheKey = `channelDetails:${videoId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    if (res.ok) {
      const data = await res.json();
      const author_url = data.author_url || null;
      const result = { author_url };
      localStorage.setItem(cacheKey, JSON.stringify(result));
      return result;
    }
  } catch (e) {
    console.warn("resolveChannelDetails error", e);
  }
  return { author_url: null };
}
