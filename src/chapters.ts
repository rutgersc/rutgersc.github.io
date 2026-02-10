import { formatTime, YOUTUBE_API_KEY } from './video-utils.js';

export interface Chapter {
  readonly title: string;
  readonly startSeconds: number;
}

const parseTimestamp = (hours: string | undefined, minutes: string, seconds: string): number =>
  (parseInt(hours ?? "0", 10)) * 3600 + parseInt(minutes, 10) * 60 + parseInt(seconds, 10);

const parseChaptersFromDescription = (description: string): readonly Chapter[] => {
  const regex = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s+(.+)$/gm;
  const chapters: Chapter[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(description)) !== null) {
    chapters.push({
      title: match[4].trim(),
      startSeconds: parseTimestamp(match[1], match[2], match[3]),
    });
  }
  return chapters.sort((a, b) => a.startSeconds - b.startSeconds);
};

export const fetchChapters = async (videoId: string): Promise<readonly Chapter[]> => {
  console.log("fetchChapters: starting for", videoId);
  const cacheKey = `chapters:${videoId}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as Chapter[];
      console.log("fetchChapters: loaded from cache,", parsed.length, "chapters");
      return parsed;
    } catch {
      // ignore bad cache
    }
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(videoId)}&key=${YOUTUBE_API_KEY}`;
    console.log("fetchChapters: calling API");
    const response = await fetch(url);
    if (!response.ok) {
      console.log("fetchChapters: API error", response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    const description: string | undefined = data?.items?.[0]?.snippet?.description;
    if (!description) {
      console.log("fetchChapters: no description found");
      return [];
    }

    console.log("fetchChapters: description length", description.length);
    const chapters = parseChaptersFromDescription(description);
    console.log("fetchChapters: parsed", chapters.length, "chapters", chapters);
    if (chapters.length > 0) {
      localStorage.setItem(cacheKey, JSON.stringify(chapters));
    }
    return chapters;
  } catch (e) {
    console.log("fetchChapters: error", e);
    return [];
  }
};

export const renderChapters = (chapters: readonly Chapter[], onSeek: (seconds: number) => void): void => {
  const container = document.getElementById("chapters-container");
  if (!container) return;

  container.innerHTML = "";

  if (chapters.length === 0) {
    container.style.display = "none";
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.flexWrap = "wrap";
  wrapper.style.justifyContent = "center";
  wrapper.style.gap = "6px";

  chapters.forEach((chapter, i) => {
    const btn = document.createElement("button");
    btn.dataset.chapterIndex = String(i);
    btn.textContent = `${formatTime(chapter.startSeconds)} ${chapter.title}`;
    btn.style.background = "#232323";
    btn.style.color = "#8ecae6";
    btn.style.border = "1px solid #333";
    btn.style.borderRadius = "8px";
    btn.style.fontSize = "0.85rem";
    btn.style.fontWeight = "bold";
    btn.style.padding = "8px 12px";
    btn.style.cursor = "pointer";
    btn.style.transition = "background 0.2s, border-color 0.2s";
    btn.onmouseenter = () => { btn.style.background = "#1a1a1a"; };
    btn.onmouseleave = () => { btn.style.background = "#232323"; };
    btn.onclick = () => onSeek(chapter.startSeconds);
    wrapper.appendChild(btn);
  });

  container.appendChild(wrapper);
  container.style.display = "block";
};


export const highlightCurrentChapter = (chapters: readonly Chapter[], currentTime: number): void => {
  const container = document.getElementById("chapters-container");
  if (!container) return;

  const activeIndex = chapters.reduce<number>(
    (acc, ch, i) => (ch.startSeconds <= currentTime ? i : acc),
    -1
  );

  container.querySelectorAll<HTMLButtonElement>("button[data-chapter-index]").forEach(btn => {
    const isActive = btn.dataset.chapterIndex === String(activeIndex);
    btn.style.borderColor = isActive ? "#ffd166" : "#333";
    btn.style.color = isActive ? "#ffd166" : "#8ecae6";
  });
};
