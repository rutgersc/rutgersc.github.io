import { getTimeAgo, formatTime } from './video-utils.js';
export const CURRENT_PODCAST_KEY = 'current-podcast';
export function isPodcastUrl(input) {
    try {
        return new URL(input).protocol === 'https:';
    }
    catch {
        return false;
    }
}
export function parsePodcastHistoryEntry(entry) {
    const episode = entry.episode;
    if (!episode || typeof episode.pageUrl !== 'string' || typeof episode.audioUrl !== 'string' || typeof entry.dateViewed !== 'string')
        return null;
    const progress = entry.progress && typeof entry.progress === 'object' ? entry.progress : null;
    return {
        kind: 'podcast',
        episode: {
            pageUrl: episode.pageUrl,
            audioUrl: episode.audioUrl,
            title: typeof episode.title === 'string' ? episode.title : '',
            show: typeof episode.show === 'string' ? episode.show : ''
        },
        dateViewed: entry.dateViewed,
        wasWatchLater: entry.wasWatchLater === true,
        ...(progress ? { progress } : {})
    };
}
const pathOf = (url) => {
    try {
        return new URL(url).pathname.replace(/\/$/, '').toLowerCase();
    }
    catch {
        return '';
    }
};
const toHttps = (url) => url.replace(/^http:\/\//, 'https://');
const fetchText = async (url) => {
    const attempt = async (candidate) => {
        const res = await fetch(candidate);
        if (!res.ok)
            throw new Error(`${candidate} answered ${res.status}`);
        return res.text();
    };
    return url.startsWith('http:') ? attempt(toHttps(url)).catch(() => attempt(url)) : attempt(url);
};
const fetchDocument = async (url, type) => new DOMParser().parseFromString(await fetchText(url), type);
export async function resolveEpisode(pageUrl) {
    const page = await fetchDocument(pageUrl, 'text/html');
    const feedHref = page.querySelector('link[type="application/rss+xml"]')?.getAttribute('href');
    const pageTitle = page.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? page.title;
    const pagePath = pathOf(pageUrl);
    const fromFeed = async () => {
        if (!feedHref || !pagePath)
            return null;
        const feed = await fetchDocument(new URL(feedHref, pageUrl).href, 'text/xml');
        const show = feed.querySelector('channel > title')?.textContent ?? '';
        const item = Array.from(feed.querySelectorAll('item'))
            .find(i => pathOf(i.querySelector('link')?.textContent?.trim() ?? '') === pagePath);
        const audioUrl = item?.querySelector('enclosure')?.getAttribute('url');
        return item && audioUrl
            ? { pageUrl, audioUrl: toHttps(audioUrl), title: item.querySelector('title')?.textContent ?? pageTitle, show }
            : null;
    };
    const fromLibsynEmbed = async () => {
        const src = Array.from(page.querySelectorAll('iframe[src*="html5-player.libsyn.com/embed/episode"]'))
            .map(iframe => iframe.getAttribute('src') ?? '')[0];
        if (!src)
            return null;
        const html = await fetchText(new URL(src, 'https://x').href);
        const field = (name) => {
            const raw = html.match(new RegExp(`"${name}":"((?:[^"\\\\]|\\\\.)*)"`))?.[1];
            return raw === undefined ? null : JSON.parse(`"${raw}"`);
        };
        const audioUrl = field('media_url');
        return audioUrl ? { pageUrl, audioUrl: toHttps(audioUrl), title: field('item_title') ?? pageTitle, show: field('podcast_title') ?? '' } : null;
    };
    const fromPage = () => {
        const source = page.querySelector('audio[src], audio source[src]');
        const src = source?.getAttribute('src');
        const title = source?.closest('audio')?.getAttribute('title') || page.querySelector('h1')?.textContent?.trim() || pageTitle;
        const show = page.querySelector('meta[property="og:site_name"]')?.getAttribute('content') ?? '';
        return src ? { pageUrl, audioUrl: toHttps(new URL(src, pageUrl).href), title, show } : null;
    };
    const orNull = (p) => p.catch(error => { console.warn('Podcast source failed', error); return null; });
    const episode = await orNull(fromFeed()) ?? await orNull(fromLibsynEmbed()) ?? fromPage();
    if (!episode)
        throw new Error('No podcast feed item or audio found on this page');
    return episode;
}
let renderId = 0;
const elements = () => ({
    container: document.getElementById('podcast-player'),
    youtube: document.getElementById('youtube-player-controls')
});
export function currentPodcastAudio() {
    return elements().container?.querySelector('audio') ?? null;
}
export function hidePodcast() {
    renderId++;
    const { container, youtube } = elements();
    currentPodcastAudio()?.pause();
    if (container) {
        container.replaceChildren();
        container.hidden = true;
    }
    if (youtube)
        youtube.hidden = false;
}
export async function showPodcast(pageUrl, hooks) {
    const { container, youtube } = elements();
    if (!container || !youtube)
        return null;
    const currentRender = ++renderId;
    const status = document.createElement('div');
    status.textContent = 'Loading podcast…';
    youtube.hidden = true;
    container.hidden = false;
    container.replaceChildren(status);
    try {
        const episode = await resolveEpisode(pageUrl);
        if (currentRender !== renderId)
            return null;
        const { startAt, onProgress } = hooks(episode);
        const title = document.createElement('a');
        title.href = episode.pageUrl;
        title.target = '_blank';
        title.rel = 'noopener noreferrer';
        title.textContent = episode.show ? `${episode.show} — ${episode.title}` : episode.title;
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.preload = 'metadata';
        audio.src = episode.audioUrl;
        audio.addEventListener('loadedmetadata', () => { if (startAt > 0)
            audio.currentTime = startAt; }, { once: true });
        const seekControls = document.createElement('div');
        seekControls.className = 'podcast-seek-controls';
        seekControls.setAttribute('role', 'group');
        seekControls.setAttribute('aria-label', 'Seek audio');
        const seekButtons = [-15, -10, -5, 5, 10, 15].map(offset => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = `${offset > 0 ? '+' : '−'}${Math.abs(offset)}s`;
            button.setAttribute('aria-label', `Seek ${offset > 0 ? 'forward' : 'backward'} ${Math.abs(offset)} seconds`);
            button.disabled = true;
            button.onclick = () => {
                if (!Number.isFinite(audio.duration) || audio.duration <= 0)
                    return;
                audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + offset));
            };
            return button;
        });
        seekControls.append(...seekButtons);
        const updateSeekButtons = () => {
            const disabled = !Number.isFinite(audio.duration) || audio.duration <= 0;
            seekButtons.map(button => { button.disabled = disabled; });
        };
        audio.addEventListener('loadedmetadata', updateSeekButtons);
        audio.addEventListener('durationchange', updateSeekButtons);
        audio.addEventListener('emptied', updateSeekButtons);
        const report = () => {
            if (audio.duration > 0)
                onProgress({ currentTime: audio.currentTime, duration: audio.duration, percentage: (audio.currentTime / audio.duration) * 100 });
        };
        let lastReport = 0;
        audio.addEventListener('timeupdate', () => {
            if (Date.now() - lastReport < 20000)
                return;
            lastReport = Date.now();
            report();
        });
        audio.addEventListener('pause', report);
        audio.addEventListener('seeked', report);
        document.title = episode.title;
        container.replaceChildren(title, audio, seekControls);
        return episode;
    }
    catch (error) {
        if (currentRender !== renderId)
            return null;
        console.warn('Podcast resolve failed', error);
        status.textContent = `Could not load podcast: ${error.message}`;
        return null;
    }
}
export function renderPodcastItem(entry, onPlay, onRemove) {
    const item = document.createElement('li');
    item.className = 'x-list-item';
    const link = document.createElement('a');
    link.href = entry.episode.pageUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `🎧 ${entry.episode.show ? entry.episode.show + ' — ' : ''}${entry.episode.title || entry.episode.pageUrl}`;
    item.append(link);
    const meta = document.createElement('span');
    meta.textContent = [
        getTimeAgo(new Date(entry.dateViewed)),
        entry.progress ? `${formatTime(entry.progress.currentTime)} / ${formatTime(entry.progress.duration)}` : ''
    ].filter(Boolean).join(' · ');
    item.append(meta);
    const play = document.createElement('button');
    play.textContent = 'Play';
    play.onclick = onPlay;
    item.append(play);
    if (onRemove) {
        const remove = document.createElement('button');
        remove.textContent = 'Remove';
        remove.onclick = onRemove;
        item.append(remove);
    }
    return item;
}
