let widgetScript = null;
let renderId = 0;
const loadWidgets = () => {
    if (widgetScript)
        return widgetScript;
    widgetScript = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://platform.twitter.com/widgets.js';
        script.onload = () => {
            if (window.twttr)
                window.twttr.ready(() => resolve(window.twttr));
            else
                reject(new Error('X widget API unavailable'));
        };
        script.onerror = () => reject(new Error('X widget script failed to load'));
        document.head.append(script);
    }).catch(error => {
        widgetScript = null;
        throw error;
    });
    return widgetScript;
};
export function hideXVideo() {
    renderId++;
    const container = document.getElementById('x-video');
    if (container) {
        container.replaceChildren();
        container.hidden = true;
    }
    const youtube = document.getElementById('youtube-player-controls');
    if (youtube)
        youtube.hidden = false;
}
export async function showXVideo(postId) {
    const container = document.getElementById('x-video');
    const youtube = document.getElementById('youtube-player-controls');
    if (!container || !youtube)
        return;
    const currentRender = ++renderId;
    const url = `https://x.com/i/status/${postId}`;
    const link = document.createElement('a');
    link.href = url;
    link.textContent = 'Open video on X';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const target = document.createElement('div');
    youtube.hidden = true;
    container.hidden = false;
    container.replaceChildren(link, target);
    try {
        const widgets = await loadWidgets();
        if (currentRender !== renderId)
            return;
        const widget = await widgets.widgets.createVideo(postId, target, { theme: 'dark' });
        if (currentRender === renderId && widget)
            link.remove();
    }
    catch (error) {
        console.warn('X video embed failed', error);
    }
}
