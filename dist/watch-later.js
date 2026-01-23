import { callGraphApi, getAppStateTodoList, getAppStateTasks, createAppStateTask } from './graph-api.js';
import { extractYouTubeId, extractTimestamp } from './video-utils.js';
import { renderVideoItem } from './ui.js';
export let watchLaterTaskId = null;
export let watchLaterListId = null;
let initWatchLaterPromise = null;
export async function initWatchLater() {
    if (initWatchLaterPromise) {
        return initWatchLaterPromise;
    }
    initWatchLaterPromise = (async () => {
        try {
            const list = await getAppStateTodoList();
            watchLaterListId = list.id;
            const tasks = await getAppStateTasks(list.id);
            let watchLaterTask = tasks.find(t => t.title === 'youtube-watch');
            if (!watchLaterTask) {
                console.log('Creating youtube-watch task...');
                watchLaterTask = await createAppStateTask(list.id, 'youtube-watch', 'Videos to watch later');
            }
            watchLaterTaskId = watchLaterTask.id;
            console.log('Watch later task initialized:', watchLaterTask);
            console.log('Task ID:', watchLaterTask.id);
            console.log('Task title:', watchLaterTask.title);
            const fullTask = await callGraphApi(`/me/todo/lists/${watchLaterListId}/tasks/${watchLaterTaskId}`);
            console.log('Full task details:', fullTask);
            await loadWatchLater();
        }
        catch (e) {
            console.error('initWatchLater error:', e);
            const status = document.getElementById('watch-later-status');
            if (status)
                status.textContent = 'Error loading watch later list';
            initWatchLaterPromise = null;
            throw e;
        }
    })();
    return initWatchLaterPromise;
}
async function getWatchLaterChecklistItems() {
    try {
        console.log('Fetching checklist items from API...');
        console.log('URL:', `/me/todo/lists/${watchLaterListId}/tasks/${watchLaterTaskId}/checklistItems`);
        const response = await callGraphApi(`/me/todo/lists/${watchLaterListId}/tasks/${watchLaterTaskId}/checklistItems`);
        console.log('Raw API response:', response);
        console.log('Response.value:', response.value);
        return response.value || [];
    }
    catch (e) {
        console.error('getWatchLaterChecklistItems error:', e);
        return [];
    }
}
export async function isVideoInWatchLater(videoId) {
    try {
        if (!watchLaterTaskId)
            return null;
        const items = await getWatchLaterChecklistItems();
        for (const item of items) {
            try {
                const videoData = JSON.parse(item.displayName);
                if (videoData.video_id === videoId) {
                    return item.id;
                }
            }
            catch {
                const id = extractYouTubeId(item.displayName) || item.displayName;
                if (id === videoId) {
                    return item.id;
                }
            }
        }
        return null;
    }
    catch (e) {
        console.error('isVideoInWatchLater error:', e);
        return null;
    }
}
export async function removeFromWatchLater(checklistItemId, listItemElement) {
    if (listItemElement?.parentNode) {
        listItemElement.parentNode.removeChild(listItemElement);
    }
    const watchLaterList = document.getElementById('watch_later_list');
    const watchLaterStatus = document.getElementById('watch-later-status');
    if (watchLaterList && watchLaterList.children.length === 0) {
        if (watchLaterStatus) {
            watchLaterStatus.textContent = 'No videos in watch later';
            watchLaterStatus.style.display = 'block';
        }
    }
    try {
        await callGraphApi(`/me/todo/lists/${watchLaterListId}/tasks/${watchLaterTaskId}/checklistItems/${checklistItemId}`, 'DELETE');
        console.log('Removed from watch later:', checklistItemId);
    }
    catch (e) {
        console.error('removeFromWatchLater error:', e);
    }
}
export async function loadWatchLater() {
    const watchLaterList = document.getElementById('watch_later_list');
    const watchLaterStatus = document.getElementById('watch-later-status');
    if (!watchLaterList || !watchLaterStatus)
        return;
    console.log('=== Load Watch Later Debug ===');
    console.log('watchLaterListId:', watchLaterListId);
    console.log('watchLaterTaskId:', watchLaterTaskId);
    console.log('initWatchLaterPromise:', initWatchLaterPromise);
    try {
        if (!watchLaterTaskId) {
            console.log('No watchLaterTaskId, initializing...');
            await initWatchLater();
            return;
        }
        watchLaterStatus.textContent = 'Loading...';
        const items = await getWatchLaterChecklistItems();
        console.log('Loaded checklist items:', items);
        console.log('Number of items:', items.length);
        watchLaterList.innerHTML = '';
        watchLaterStatus.style.display = 'none';
        if (items.length === 0) {
            console.log('No items to display');
            watchLaterStatus.textContent = 'No videos in watch later';
            watchLaterStatus.style.display = 'block';
            return;
        }
        const videoDataList = items.map(item => {
            try {
                const videoData = JSON.parse(item.displayName);
                if (!videoData.video_id) {
                    throw new Error('No video_id in parsed data');
                }
                return { videoData, checklistItemId: item.id, originalUrl: null };
            }
            catch {
                const videoId = extractYouTubeId(item.displayName) || item.displayName;
                const timestamp = extractTimestamp(item.displayName);
                return {
                    videoData: {
                        video_id: videoId,
                        title: 'Loading...',
                        author: 'Loading...',
                        author_url: undefined,
                        timestamp: timestamp ?? undefined
                    },
                    checklistItemId: item.id,
                    originalUrl: item.displayName
                };
            }
        });
        const listItems = videoDataList.map(({ videoData, checklistItemId, originalUrl }) => {
            const element = renderVideoItem(videoData, null, {
                onRemove: () => removeFromWatchLater(checklistItemId, element),
                playUrl: originalUrl
            });
            return { element, videoData };
        });
        listItems.forEach(({ element }) => {
            watchLaterList.appendChild(element);
        });
        const itemsNeedingMetadata = listItems.filter(({ videoData }) => !videoData.title || videoData.title === 'Loading...');
        if (itemsNeedingMetadata.length > 0) {
            Promise.all(itemsNeedingMetadata.map(async ({ element, videoData }) => {
                const videoId = videoData.video_id;
                try {
                    const cacheKey = `videoMetadata:${videoId}`;
                    let metadata = localStorage.getItem(cacheKey);
                    if (!metadata) {
                        const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
                        if (res.ok) {
                            const data = await res.json();
                            metadata = JSON.stringify({
                                title: data.title,
                                author: data.author_name,
                                author_url: data.author_url
                            });
                            localStorage.setItem(cacheKey, metadata);
                        }
                    }
                    if (metadata) {
                        const data = JSON.parse(metadata);
                        const titleEl = element.querySelector('span[style*="font-weight: 500"]');
                        const authorEl = element.querySelector('a[style*="font-weight: bold"]');
                        if (titleEl)
                            titleEl.textContent = data.title || 'Unknown title';
                        if (authorEl) {
                            authorEl.textContent = data.author || 'Unknown author';
                            if (data.author_url)
                                authorEl.href = data.author_url;
                        }
                    }
                }
                catch (e) {
                    console.warn('Failed to fetch metadata for', videoId, e);
                }
            })).catch(e => console.error('Error fetching metadata batch:', e));
        }
        console.log('Successfully rendered', items.length, 'items');
        console.log('==============================');
    }
    catch (e) {
        console.error('loadWatchLater error:', e);
        console.log('==============================');
        watchLaterStatus.textContent = 'Error loading watch later';
        watchLaterStatus.style.display = 'block';
    }
}
