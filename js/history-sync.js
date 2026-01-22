import { getAppStateTodoList, getAppStateTasks, createAppStateTask, updateAppStateTask } from './graph-api.js';
import { getHistory } from './history.js';
import { msalInstance } from './auth.js';

// Task state
export let historyTaskId = null;
export let historyListId = null;
let initHistoryPromise = null;

// Debounce state
let syncTimeout = null;
let pendingSync = false;
const SYNC_DEBOUNCE_MS = 30000; // 30 seconds

// Initialize history task in TODO
export async function initHistorySync() {
  // Prevent race conditions - return existing promise if initialization in progress
  if (initHistoryPromise) {
    return initHistoryPromise;
  }

  initHistoryPromise = (async () => {
    try {
      // Check if user is signed in
      const account = msalInstance.getActiveAccount();
      if (!account) {
        console.log('Not signed in, skipping history sync init');
        return;
      }

      console.log('Initializing history sync...');
      const appStateList = await getAppStateTodoList();
      historyListId = appStateList.id;

      // Find or create the youtube-history task
      const tasks = await getAppStateTasks(historyListId);
      let historyTask = tasks.find(task => task.title === 'youtube-history');

      if (historyTask) {
        console.log('Found existing youtube-history task:', historyTask.id);
        historyTaskId = historyTask.id;
        // Load history from TODO and merge with local
        await loadHistoryFromTodo();
      } else {
        console.log('Creating youtube-history task...');
        // Create with current local history as initial content
        const history = getHistory();
        const body = historyToBody(history);
        historyTask = await createAppStateTask(historyListId, 'youtube-history', body);
        historyTaskId = historyTask.id;
        console.log('Created youtube-history task:', historyTaskId);
      }
    } catch (e) {
      console.error('initHistorySync error:', e);
      // Reset promise so retry is possible
      initHistoryPromise = null;
      throw e;
    }
  })();

  return initHistoryPromise;
}

// Convert history array to task body format (JSON lines)
function historyToBody(history) {
  // Each line is a JSON object representing one history entry
  // Limit to most recent 200 entries to stay within TODO size limits
  const limitedHistory = history.slice(0, 200);
  return limitedHistory.map(entry => JSON.stringify(entry)).join('\n');
}

// Parse task body back to history array
function bodyToHistory(body) {
  if (!body || body.trim() === '') {
    return [];
  }
  const lines = body.split('\n').filter(line => line.trim() !== '');
  const history = [];
  for (const line of lines) {
    try {
      history.push(JSON.parse(line));
    } catch (e) {
      console.warn('Failed to parse history line:', line, e);
    }
  }
  return history;
}

// Load history from TODO and merge with local storage
async function loadHistoryFromTodo() {
  try {
    // Fetch the task with body content
    const { callGraphApi } = await import('./graph-api.js');
    const task = await callGraphApi(`/me/todo/lists/${historyListId}/tasks/${historyTaskId}`);

    const todoHistory = bodyToHistory(task.body?.content || '');
    const localHistory = getHistory();

    console.log('TODO history entries:', todoHistory.length);
    console.log('Local history entries:', localHistory.length);

    // Merge: combine both, dedupe by video_id, sort by dateViewed (newest first)
    const merged = mergeHistories(localHistory, todoHistory);

    // Save merged history to localStorage
    localStorage.setItem('history', JSON.stringify(merged));
    console.log('Merged history entries:', merged.length);

    // Re-render history UI with merged data (dynamic import to avoid circular dep)
    const { renderHistory } = await import('./history.js');
    renderHistory();
  } catch (e) {
    console.error('loadHistoryFromTodo error:', e);
  }
}

// Merge two history arrays, keeping most recent entry per video
function mergeHistories(local, remote) {
  const byVideoId = new Map();

  // Process all entries, keeping the one with latest dateViewed per video
  for (const entry of [...local, ...remote]) {
    const videoId = entry.videoData?.video_id;
    if (!videoId) continue;

    const existing = byVideoId.get(videoId);
    if (!existing) {
      byVideoId.set(videoId, entry);
    } else {
      // Keep the one with the later dateViewed
      const existingDate = new Date(existing.dateViewed);
      const entryDate = new Date(entry.dateViewed);
      if (entryDate > existingDate) {
        byVideoId.set(videoId, entry);
      } else if (entryDate.getTime() === existingDate.getTime()) {
        // Same date, merge progress (keep better progress data)
        if (entry.progress && (!existing.progress || entry.progress.currentTime > existing.progress.currentTime)) {
          byVideoId.set(videoId, { ...existing, progress: entry.progress });
        }
      }
    }
  }

  // Sort by dateViewed descending (newest first)
  return Array.from(byVideoId.values()).sort((a, b) => {
    return new Date(b.dateViewed) - new Date(a.dateViewed);
  });
}

// Sync history to TODO (debounced)
export function scheduleSyncToTodo() {
  if (!historyTaskId || !historyListId) {
    console.log('History sync not initialized, skipping sync');
    return;
  }

  pendingSync = true;

  // Clear existing timeout
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  // Schedule sync after debounce period
  syncTimeout = setTimeout(() => {
    if (pendingSync) {
      syncHistoryToTodo();
    }
  }, SYNC_DEBOUNCE_MS);

  console.log(`History sync scheduled in ${SYNC_DEBOUNCE_MS / 1000}s`);
}

// Sync history to TODO immediately
export async function syncHistoryToTodo() {
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
    // Schedule retry
    pendingSync = true;
    syncTimeout = setTimeout(() => syncHistoryToTodo(), SYNC_DEBOUNCE_MS);
  }
}

// Force sync immediately (useful when adding new video to history)
export function syncHistoryNow() {
  if (!historyTaskId || !historyListId) {
    console.log('History sync not initialized, skipping sync');
    return;
  }

  // If there's a pending debounced sync, execute it now
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }

  syncHistoryToTodo();
}

// Check if history sync is ready
export function isHistorySyncReady() {
  return historyTaskId !== null && historyListId !== null;
}
