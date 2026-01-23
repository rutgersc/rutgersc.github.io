import { APP_VERSION } from './version.js';
import { initializePlayer, select_input_vid, apply_input_vid_from_button } from './youtube-player.js';
import { renderHistory, clearHistory, dumpAllEvents } from './history.js';
import { msalLogin, msalLogout, handleRedirectPromise, msalInstance } from './auth.js';
import { loadWatchLater } from './watch-later.js';
import { initHistorySync, isHistorySyncEnabled } from './history-sync.js';
import { initViewportManager } from './ui.js';
import { getAppStateTodoList, getAppStateTasks, createAppStateTask, updateAppStateTask } from './graph-api.js';
import { initDebugConsole, toggleDebugConsole, clearDebugLogs } from './debug-console.js';

// Make functions globally available for inline HTML handlers
window.select_input_vid = select_input_vid;
window.apply_input_vid_from_button = apply_input_vid_from_button;
window.clearHistory = clearHistory;
window.loadWatchLater = loadWatchLater;
window.dumpAllEvents = dumpAllEvents;
window.toggleDebugConsole = toggleDebugConsole;
window.clearDebugLogs = clearDebugLogs;

// Expose Graph API functions for testing
window.getAppStateTodoList = getAppStateTodoList;
window.getAppStateTasks = getAppStateTasks;
window.createAppStateTask = createAppStateTask;
window.updateAppStateTask = updateAppStateTask;

// Initialize YouTube player
initializePlayer();

// Handle MSAL redirect promise
handleRedirectPromise();

// Initialize viewport manager
initViewportManager();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
  // Initialize debug console
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

  // Restore mobile login flow preference
  const forceMobileCheckbox = document.getElementById('msal-force-mobile');
  if (forceMobileCheckbox) {
    const savedPreference = localStorage.getItem('msal-force-mobile');
    if (savedPreference === 'true') {
      forceMobileCheckbox.checked = true;
    }

    forceMobileCheckbox.addEventListener('change', function() {
      localStorage.setItem('msal-force-mobile', this.checked.toString());
    });
  }

  // Restore history sync preference
  const historySyncCheckbox = document.getElementById('history-sync-enabled');
  if (historySyncCheckbox) {
    const savedPreference = localStorage.getItem('history-sync-enabled');
    if (savedPreference === 'true') {
      historySyncCheckbox.checked = true;
    }

    historySyncCheckbox.addEventListener('change', function() {
      localStorage.setItem('history-sync-enabled', this.checked.toString());
      // If enabled and signed in, initialize history sync now
      if (this.checked && msalInstance.getActiveAccount()) {
        initHistorySync().catch(e => console.error('Failed to init history sync:', e));
      }
    });
  }

  // Render history on page load
  renderHistory();

  // Display version
  const versionEl = document.getElementById('commit-hash');
  if (versionEl) {
    versionEl.textContent = APP_VERSION;
    versionEl.title = 'Build version: ' + APP_VERSION;
  }
});
