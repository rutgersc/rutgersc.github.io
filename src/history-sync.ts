import { getAppStateTodoList, getAppStateTasks, createAppStateTask, updateAppStateTask, callGraphApi, TodoTask } from './graph-api.js';
import { getHistory, HistoryEntry } from './history.js';
import { msalInstance } from './auth.js';

export let historyTaskId: string | null = null;
export let historyListId: string | null = null;
let initHistoryPromise: Promise<void> | null = null;

let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingSync = false;
const SYNC_DEBOUNCE_MS = 30000;

export function isHistorySyncEnabled(): boolean {
  return localStorage.getItem('history-sync-enabled') === 'true';
}

export async function initHistorySync(): Promise<void> {
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
      } else {
        console.log('Creating youtube-history task...');
        const history = getHistory();
        const body = historyToBody(history);
        historyTask = await createAppStateTask(historyListId, 'youtube-history', body);
        historyTaskId = historyTask.id;
        console.log('Created youtube-history task:', historyTaskId);
      }
    } catch (e) {
      console.error('initHistorySync error:', e);
      initHistoryPromise = null;
      throw e;
    }
  })();

  return initHistoryPromise;
}

function historyToBody(history: HistoryEntry[]): string {
  const limitedHistory = history.slice(0, 200);
  return limitedHistory.map(entry => JSON.stringify(entry)).join('\n');
}

function bodyToHistory(body: string): HistoryEntry[] {
  if (!body || body.trim() === '') {
    return [];
  }
  const lines = body.split('\n').filter(line => line.trim() !== '');
  const history: HistoryEntry[] = [];
  for (const line of lines) {
    try {
      history.push(JSON.parse(line) as HistoryEntry);
    } catch (e) {
      console.warn('Failed to parse history line:', line, e);
    }
  }
  return history;
}

async function loadHistoryFromTodo(): Promise<void> {
  try {
    const task = await callGraphApi<TodoTask>(`/me/todo/lists/${historyListId}/tasks/${historyTaskId}`);

    const todoHistory = bodyToHistory(task.body?.content || '');
    const localHistory = getHistory();

    console.log('TODO history entries:', todoHistory.length);
    console.log('Local history entries:', localHistory.length);

    const merged = mergeHistories(localHistory, todoHistory);

    localStorage.setItem('history', JSON.stringify(merged));
    console.log('Merged history entries:', merged.length);

    const { renderHistory } = await import('./history.js');
    renderHistory();
  } catch (e) {
    console.error('loadHistoryFromTodo error:', e);
  }
}

function mergeHistories(local: HistoryEntry[], remote: HistoryEntry[]): HistoryEntry[] {
  const byVideoId = new Map<string, HistoryEntry>();

  for (const entry of [...local, ...remote]) {
    const videoId = entry.videoData?.video_id;
    if (!videoId) continue;

    const existing = byVideoId.get(videoId);
    if (!existing) {
      byVideoId.set(videoId, entry);
    } else {
      const existingDate = new Date(existing.dateViewed);
      const entryDate = new Date(entry.dateViewed);
      if (entryDate > existingDate) {
        byVideoId.set(videoId, entry);
      } else if (entryDate.getTime() === existingDate.getTime()) {
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

export function scheduleSyncToTodo(): void {
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

export async function syncHistoryToTodo(): Promise<void> {
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
  } catch (e) {
    console.error('syncHistoryToTodo error:', e);
    pendingSync = true;
    syncTimeout = setTimeout(() => syncHistoryToTodo(), SYNC_DEBOUNCE_MS);
  }
}

export function syncHistoryNow(): void {
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

export function isHistorySyncReady(): boolean {
  return historyTaskId !== null && historyListId !== null;
}
