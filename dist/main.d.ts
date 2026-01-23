import { select_input_vid, apply_input_vid_from_button } from './youtube-player.js';
import { clearHistory, dumpAllEvents } from './history.js';
import { loadWatchLater } from './watch-later.js';
import { getAppStateTodoList, getAppStateTasks, createAppStateTask, updateAppStateTask } from './graph-api.js';
import { toggleDebugConsole, clearDebugLogs } from './debug-console.js';
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
