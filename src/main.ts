import { APP_VERSION } from './version.js';
import { initializePlayer, select_input_vid, apply_input_vid_from_button } from './youtube-player.js';
import { renderHistory, clearHistory, dumpAllEvents } from './history.js';
import { msalLogin, msalLogout, handleRedirectPromise, msalInstance } from './auth.js';
import { loadWatchLater } from './watch-later.js';
import { initHistorySync } from './history-sync.js';
import { initViewportManager } from './ui.js';
import { getAppStateTodoList, getAppStateTasks, createAppStateTask, updateAppStateTask } from './graph-api.js';
import { initDebugConsole, toggleDebugConsole, clearDebugLogs } from './debug-console.js';

declare global {
  interface Window {
    select_input_vid: typeof select_input_vid;
    apply_input_vid_from_button: typeof apply_input_vid_from_button;
    clearHistory: typeof clearHistory;
    loadWatchLater: typeof loadWatchLater;
    dumpAllEvents: typeof dumpAllEvents;
    toggleDebugConsole: typeof toggleDebugConsole;
    clearDebugLogs: typeof clearDebugLogs;
    getAppStateTodoList: typeof getAppStateTodoList;
    getAppStateTasks: typeof getAppStateTasks;
    createAppStateTask: typeof createAppStateTask;
    updateAppStateTask: typeof updateAppStateTask;
  }
}

window.select_input_vid = select_input_vid;
window.apply_input_vid_from_button = apply_input_vid_from_button;
window.clearHistory = clearHistory;
window.loadWatchLater = loadWatchLater;
window.dumpAllEvents = dumpAllEvents;
window.toggleDebugConsole = toggleDebugConsole;
window.clearDebugLogs = clearDebugLogs;

window.getAppStateTodoList = getAppStateTodoList;
window.getAppStateTasks = getAppStateTasks;
window.createAppStateTask = createAppStateTask;
window.updateAppStateTask = updateAppStateTask;

initializePlayer();

handleRedirectPromise();

initViewportManager();

document.addEventListener('DOMContentLoaded', function() {
  initDebugConsole();

  const btn = document.getElementById('msal-login-btn');
  if (btn) {
    btn.onclick = function() {
      const account = msalInstance.getActiveAccount();
      if (account) {
        msalLogout();
      } else {
        msalLogin();
      }
    };
  }

  const forceMobileCheckbox = document.getElementById('msal-force-mobile') as HTMLInputElement | null;
  if (forceMobileCheckbox) {
    const savedPreference = localStorage.getItem('msal-force-mobile');
    if (savedPreference === 'true') {
      forceMobileCheckbox.checked = true;
    }

    forceMobileCheckbox.addEventListener('change', function() {
      localStorage.setItem('msal-force-mobile', this.checked.toString());
    });
  }

  const historySyncCheckbox = document.getElementById('history-sync-enabled') as HTMLInputElement | null;
  if (historySyncCheckbox) {
    const savedPreference = localStorage.getItem('history-sync-enabled');
    if (savedPreference === 'true') {
      historySyncCheckbox.checked = true;
    }

    historySyncCheckbox.addEventListener('change', function() {
      localStorage.setItem('history-sync-enabled', this.checked.toString());
      if (this.checked && msalInstance.getActiveAccount()) {
        initHistorySync().catch(e => console.error('Failed to init history sync:', e));
      }
    });
  }

  renderHistory();

  const versionEl = document.getElementById('commit-hash');
  if (versionEl) {
    versionEl.textContent = APP_VERSION;
    versionEl.title = 'Build version: ' + APP_VERSION;
  }
});
