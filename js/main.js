import { APP_VERSION } from './version.js';
import { initializePlayer, select_input_vid, apply_input_vid_from_button } from './youtube-player.js';
import { renderHistory, clearHistory, dumpAllEvents } from './history.js';
import { msalLogin, msalLogout, handleRedirectPromise, msalInstance } from './auth.js';
import { loadWatchLater } from './watch-later.js';
import { initViewportManager } from './ui.js';
import { getAppStateTodoList, getAppStateTasks, createAppStateTask, updateAppStateTask } from './graph-api.js';

// Make functions globally available for inline HTML handlers
window.select_input_vid = select_input_vid;
window.apply_input_vid_from_button = apply_input_vid_from_button;
window.clearHistory = clearHistory;
window.loadWatchLater = loadWatchLater;
window.dumpAllEvents = dumpAllEvents;

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

  // Render history on page load
  renderHistory();

  // Display version
  const versionEl = document.getElementById('commit-hash');
  if (versionEl) {
    versionEl.textContent = APP_VERSION;
    versionEl.title = 'Build version: ' + APP_VERSION;
  }
});
