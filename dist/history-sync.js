import { getAppStateTodoList, getAppStateTasks, createAppStateTask, updateAppStateTask, callGraphApi } from './graph-api.js';
import { getHistory } from './history.js';
import { msalInstance } from './auth.js';
export let historyTaskId = null;
export let historyListId = null;
let initHistoryPromise = null;
let syncTimeout = null;
let pendingSync = false;
const SYNC_DEBOUNCE_MS = 30000;
export function isHistorySyncEnabled() {
    return localStorage.getItem('history-sync-enabled') === 'true';
}
export async function initHistorySync() {
    if (!isHistorySyncEnabled()) {
        console.log('History sync disabled in settings, skipping init');
        return;
    }
    if (initHistoryPromise) {
        return initHistoryPromise;
    }
    initHistoryPromise = (async () => {
        try {
            const account = msalInstance.getActiveAccount();
            if (!account) {
                console.log('Not signed in, skipping history sync init');
                return;
            }
            console.log('Initializing history sync...');
            const appStateList = await getAppStateTodoList();
            historyListId = appStateList.id;
            const tasks = await getAppStateTasks(historyListId);
            let historyTask = tasks.find(task => task.title === 'youtube-history');
            if (historyTask) {
                console.log('Found existing youtube-history task:', historyTask.id);
                historyTaskId = historyTask.id;
                await loadHistoryFromTodo();
            }
            else {
                console.log('Creating youtube-history task...');
                const history = getHistory();
                const body = historyToBody(history);
                historyTask = await createAppStateTask(historyListId, 'youtube-history', body);
                historyTaskId = historyTask.id;
                console.log('Created youtube-history task:', historyTaskId);
            }
        }
        catch (e) {
            console.error('initHistorySync error:', e);
            initHistoryPromise = null;
            throw e;
        }
    })();
    return initHistoryPromise;
}
function historyToBody(history) {
    const limitedHistory = history.slice(0, 200);
    return limitedHistory.map(entry => JSON.stringify(entry)).join('\n');
}
function bodyToHistory(body) {
    if (!body || body.trim() === '') {
        return [];
    }
    const lines = body.split('\n').filter(line => line.trim() !== '');
    const history = [];
    for (const line of lines) {
        try {
            history.push(JSON.parse(line));
        }
        catch (e) {
            console.warn('Failed to parse history line:', line, e);
        }
    }
    return history;
}
async function loadHistoryFromTodo() {
    try {
        const task = await callGraphApi(`/me/todo/lists/${historyListId}/tasks/${historyTaskId}`);
        const todoHistory = bodyToHistory(task.body?.content || '');
        const localHistory = getHistory();
        console.log('TODO history entries:', todoHistory.length);
        console.log('Local history entries:', localHistory.length);
        const merged = mergeHistories(localHistory, todoHistory);
        localStorage.setItem('history', JSON.stringify(merged));
        console.log('Merged history entries:', merged.length);
        const { renderHistory } = await import('./history.js');
        renderHistory();
    }
    catch (e) {
        console.error('loadHistoryFromTodo error:', e);
    }
}
function mergeHistories(local, remote) {
    const byVideoId = new Map();
    for (const entry of [...local, ...remote]) {
        const videoId = entry.videoData?.video_id;
        if (!videoId)
            continue;
        const existing = byVideoId.get(videoId);
        if (!existing) {
            byVideoId.set(videoId, entry);
        }
        else {
            const existingDate = new Date(existing.dateViewed);
            const entryDate = new Date(entry.dateViewed);
            if (entryDate > existingDate) {
                byVideoId.set(videoId, entry);
            }
            else if (entryDate.getTime() === existingDate.getTime()) {
                if (entry.progress && (!existing.progress || entry.progress.currentTime > existing.progress.currentTime)) {
                    byVideoId.set(videoId, { ...existing, progress: entry.progress });
                }
            }
        }
    }
    return Array.from(byVideoId.values()).sort((a, b) => {
        return new Date(b.dateViewed).getTime() - new Date(a.dateViewed).getTime();
    });
}
export function scheduleSyncToTodo() {
    if (!isHistorySyncEnabled()) {
        return;
    }
    if (!historyTaskId || !historyListId) {
        console.log('History sync not initialized, skipping sync');
        return;
    }
    pendingSync = true;
    if (syncTimeout) {
        clearTimeout(syncTimeout);
    }
    syncTimeout = setTimeout(() => {
        if (pendingSync) {
            syncHistoryToTodo();
        }
    }, SYNC_DEBOUNCE_MS);
    console.log(`History sync scheduled in ${SYNC_DEBOUNCE_MS / 1000}s`);
}
export async function syncHistoryToTodo() {
    if (!isHistorySyncEnabled()) {
        return;
    }
    if (!historyTaskId || !historyListId) {
        console.log('History sync not initialized, skipping sync');
        return;
    }
    pendingSync = false;
    if (syncTimeout) {
        clearTimeout(syncTimeout);
        syncTimeout = null;
    }
    try {
        const history = getHistory();
        const body = historyToBody(history);
        console.log('Syncing history to TODO...', history.length, 'entries');
        await updateAppStateTask(historyListId, historyTaskId, 'youtube-history', body);
        console.log('History synced to TODO successfully');
    }
    catch (e) {
        console.error('syncHistoryToTodo error:', e);
        pendingSync = true;
        syncTimeout = setTimeout(() => syncHistoryToTodo(), SYNC_DEBOUNCE_MS);
    }
}
export function syncHistoryNow() {
    if (!isHistorySyncEnabled()) {
        return;
    }
    if (!historyTaskId || !historyListId) {
        console.log('History sync not initialized, skipping sync');
        return;
    }
    if (syncTimeout) {
        clearTimeout(syncTimeout);
        syncTimeout = null;
    }
    syncHistoryToTodo();
}
export function isHistorySyncReady() {
    return historyTaskId !== null && historyListId !== null;
}
