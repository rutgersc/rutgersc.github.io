# History Storage Migration Plan

## Overview
Implement dual history storage system with ability to toggle between localStorage and Microsoft To Do, plus migration capability.

## Architecture

### 1. Storage Abstraction Layer (`js/history-storage.js`)

Create an interface for history storage with two implementations:

**Interface:**
```javascript
class HistoryStorage {
  async getHistory() // Returns array of history events
  async addToHistory(videoData, timestamp, wasWatchLater) // Appends new event
  async clearHistory() // Clears all history
  isAvailable() // Check if storage is accessible
}
```

**Implementations:**
- `LocalStorageHistoryProvider` - Current behavior (localStorage)
- `TodoHistoryProvider` - New To Do integration

### 2. LocalStorage Provider (`js/local-storage-history.js`)

```javascript
export class LocalStorageHistoryProvider {
  getHistory() {
    return JSON.parse(localStorage.getItem("history") || "[]");
  }

  addToHistory(videoData, timestamp, wasWatchLater) {
    const history = this.getHistory();
    // Remove duplicates, add new entry
    const filtered = history.filter(item => item.videoData.video_id !== videoData.video_id);
    filtered.unshift({ videoData, timestamp, wasWatchLater });
    localStorage.setItem("history", JSON.stringify(filtered));
  }

  clearHistory() {
    localStorage.removeItem("history");
  }

  isAvailable() {
    return true; // localStorage always available
  }
}
```

### 3. To Do Provider (`js/todo-history-provider.js`)

```javascript
export class TodoHistoryProvider {
  constructor(graphApi) {
    this.graphApi = graphApi;
    this.listId = null;
    this.taskId = null;
  }

  async initialize() {
    // Get/create appstate list
    const list = await this.graphApi.getAppStateTodoList();
    this.listId = list.id;

    // Get/create youtube-history task
    const tasks = await this.graphApi.getAppStateTasks(list.id);
    let historyTask = tasks.find(t => t.title === 'youtube-history');

    if (!historyTask) {
      historyTask = await this.graphApi.createAppStateTask(
        list.id,
        'youtube-history',
        JSON.stringify({ events: [] })
      );
    }

    this.taskId = historyTask.id;
  }

  async getHistory() {
    if (!this.taskId) await this.initialize();

    const task = await this.graphApi.callGraphApi(
      `/me/todo/lists/${this.listId}/tasks/${this.taskId}`
    );

    try {
      const data = JSON.parse(task.body.content || '{"events":[]}');
      return data.events || [];
    } catch (e) {
      console.error('Failed to parse history from To Do', e);
      return [];
    }
  }

  async addToHistory(videoData, timestamp, wasWatchLater) {
    if (!this.taskId) await this.initialize();

    const history = await this.getHistory();

    // Remove duplicates, add new entry
    const filtered = history.filter(item => item.videoData.video_id !== videoData.video_id);
    filtered.unshift({ videoData, timestamp, wasWatchLater });

    // Keep last 50 entries (configurable)
    const pruned = filtered.slice(0, 50);

    // Update task body
    await this.graphApi.updateAppStateTask(
      this.listId,
      this.taskId,
      'youtube-history',
      JSON.stringify({ events: pruned })
    );
  }

  async clearHistory() {
    if (!this.taskId) await this.initialize();

    await this.graphApi.updateAppStateTask(
      this.listId,
      this.taskId,
      'youtube-history',
      JSON.stringify({ events: [] })
    );
  }

  isAvailable() {
    // Check if user is signed in to MSAL
    return !!msalInstance?.getActiveAccount();
  }
}
```

### 4. Update `js/history.js`

```javascript
import { LocalStorageHistoryProvider } from './local-storage-history.js';
import { TodoHistoryProvider } from './todo-history-provider.js';

let currentProvider = null;

export function initializeHistoryStorage() {
  const preference = localStorage.getItem('history-storage-provider') || 'localStorage';
  switchProvider(preference);
}

export function switchProvider(providerName) {
  if (providerName === 'todo') {
    currentProvider = new TodoHistoryProvider(/* pass graph api */);
  } else {
    currentProvider = new LocalStorageHistoryProvider();
  }

  localStorage.setItem('history-storage-provider', providerName);
}

export async function getHistory() {
  return await currentProvider.getHistory();
}

export async function addToHistory(videoData, name, wasWatchLater = false) {
  const timestamp = new Date().toISOString();
  await currentProvider.addToHistory(videoData, timestamp, wasWatchLater);
  await renderHistory();
}

export async function clearHistory() {
  await currentProvider.clearHistory();
  await renderHistory();
}

export function getCurrentProvider() {
  return currentProvider instanceof TodoHistoryProvider ? 'todo' : 'localStorage';
}
```

### 5. Migration Function (`js/history.js`)

```javascript
export async function migrateToTodo() {
  try {
    // Get history from localStorage
    const localProvider = new LocalStorageHistoryProvider();
    const localHistory = localProvider.getHistory();

    if (localHistory.length === 0) {
      alert('No history to migrate');
      return false;
    }

    // Switch to To Do provider
    const todoProvider = new TodoHistoryProvider(/* pass graph api */);
    await todoProvider.initialize();

    // Migrate all entries (keeping last 50)
    const toMigrate = localHistory.slice(0, 50);

    for (const entry of toMigrate.reverse()) {
      await todoProvider.addToHistory(
        entry.videoData,
        entry.timestamp,
        entry.wasWatchLater || false
      );
    }

    // Success - switch to To Do provider
    switchProvider('todo');
    await renderHistory();

    alert(`Successfully migrated ${toMigrate.length} history entries to Microsoft To Do`);
    return true;
  } catch (e) {
    console.error('Migration failed', e);
    alert('Migration failed: ' + e.message);
    return false;
  }
}
```

### 6. UI Controls (in `youtube.html`)

Add to the History section:

```html
<div style="flex: 1; min-width: 300px; max-width: 600px;">
  <h3 style="text-align: center; color: #8ecae6; margin-bottom: 10px;">History</h3>

  <!-- Storage Provider Controls -->
  <div style="text-align: center; margin-bottom: 10px;">
    <select id="history-storage-provider" style="padding: 4px 8px; background: #2d2d2d; color: #fff; border: 1px solid #333; border-radius: 4px;">
      <option value="localStorage">Local Storage</option>
      <option value="todo">Microsoft To Do</option>
    </select>
    <span id="history-storage-status" style="margin-left: 8px; font-size: 0.85rem; color: #bbb;"></span>
  </div>

  <!-- Migration Button (visible only when using localStorage) -->
  <div id="history-migration-container" style="text-align: center; margin-bottom: 10px;">
    <button id="migrate-history-btn" onclick="migrateHistory()" style="padding: 6px 12px; background: #2d6a4f; color: #fff; border: none; border-radius: 4px; cursor: pointer;">
      Migrate to Microsoft To Do
    </button>
  </div>

  <ul id="history_list"></ul>

  <!-- Rest of history UI -->
</div>
```

### 7. Wire Up in `js/main.js`

```javascript
import { initializeHistoryStorage, switchProvider, migrateToTodo, getCurrentProvider } from './history.js';

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  // ... existing code ...

  initializeHistoryStorage();
  updateHistoryUI();

  // Provider selector
  const providerSelect = document.getElementById('history-storage-provider');
  providerSelect.value = getCurrentProvider();
  providerSelect.onchange = function() {
    switchProvider(this.value);
    updateHistoryUI();
    renderHistory();
  };
});

function updateHistoryUI() {
  const provider = getCurrentProvider();
  const statusEl = document.getElementById('history-storage-status');
  const migrationContainer = document.getElementById('history-migration-container');

  if (provider === 'todo') {
    statusEl.textContent = '☁️ Synced';
    migrationContainer.style.display = 'none';
  } else {
    statusEl.textContent = '💾 Local';
    migrationContainer.style.display = 'block';
  }
}

// Make migration function available globally
window.migrateHistory = async function() {
  if (confirm('Migrate your history to Microsoft To Do? This will sync across devices.')) {
    const success = await migrateToTodo();
    if (success) {
      updateHistoryUI();
    }
  }
};
```

## Implementation Order

1. Create `LocalStorageHistoryProvider` (extract current logic)
2. Create `TodoHistoryProvider`
3. Create abstraction layer in `history.js`
4. Add UI controls
5. Wire up in `main.js`
6. Test localStorage → To Do migration
7. Test switching between providers

## Settings Persistence

- Current provider stored in: `localStorage.getItem('history-storage-provider')`
- Default: `'localStorage'`
- Options: `'localStorage'` or `'todo'`

## Edge Cases to Handle

1. **User not signed in** - Disable To Do option, show message
2. **To Do API failure** - Fallback to localStorage, show error
3. **Migration during playback** - Queue migration, don't block
4. **Partial migration failure** - Don't switch provider, keep localStorage
5. **Provider switch with unsaved data** - Warn user

## Testing Checklist

- [ ] LocalStorage provider works (existing behavior)
- [ ] To Do provider reads/writes correctly
- [ ] Migration transfers all entries
- [ ] Migration handles duplicates
- [ ] UI updates when switching providers
- [ ] Status shows correct sync state
- [ ] Migration button hidden when using To Do
- [ ] Settings persist across page reloads
- [ ] Works when user signs out (falls back to localStorage)
