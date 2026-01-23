const MAX_LOGS = 200;
const logs = [];

const originalConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

const formatArgs = (args) =>
  args.map(arg => {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');

const addLog = (level, args) => {
  const entry = {
    level,
    message: formatArgs(args),
    timestamp: new Date().toLocaleTimeString(),
  };
  logs.push(entry);
  if (logs.length > MAX_LOGS) logs.shift();
  renderLogs();
};

console.log = (...args) => {
  originalConsole.log(...args);
  addLog('log', args);
};

console.warn = (...args) => {
  originalConsole.warn(...args);
  addLog('warn', args);
};

console.error = (...args) => {
  originalConsole.error(...args);
  addLog('error', args);
};

window.addEventListener('error', (e) => {
  addLog('error', [`Uncaught: ${e.message} at ${e.filename}:${e.lineno}`]);
});

window.addEventListener('unhandledrejection', (e) => {
  addLog('error', [`Unhandled rejection: ${e.reason}`]);
});

const levelColors = {
  log: '#6cf06c',
  warn: '#ffd166',
  error: '#ff6b6b',
};

const renderLogs = () => {
  const container = document.getElementById('debug-console-logs');
  if (!container) return;

  container.innerHTML = logs
    .slice()
    .reverse()
    .map(({ level, message, timestamp }) => `
      <div style="margin-bottom: 4px; padding: 4px 6px; background: #1a1a1a; border-radius: 4px; border-left: 3px solid ${levelColors[level]};">
        <span style="color: #666; font-size: 0.75rem;">${timestamp}</span>
        <span style="color: ${levelColors[level]}; font-weight: 600; margin-left: 6px;">[${level.toUpperCase()}]</span>
        <pre style="margin: 2px 0 0 0; white-space: pre-wrap; word-break: break-all; color: #ddd; font-size: 0.8rem;">${escapeHtml(message)}</pre>
      </div>
    `)
    .join('');
};

const escapeHtml = (str) =>
  str.replace(/&/g, '&amp;')
     .replace(/</g, '&lt;')
     .replace(/>/g, '&gt;')
     .replace(/"/g, '&quot;');

export const clearDebugLogs = () => {
  logs.length = 0;
  renderLogs();
};

export const toggleDebugConsole = () => {
  const panel = document.getElementById('debug-console-panel');
  const btn = document.getElementById('debug-console-toggle');
  if (!panel || !btn) return;

  const isVisible = panel.style.display !== 'none';
  panel.style.display = isVisible ? 'none' : 'block';
  btn.textContent = isVisible ? '🐛' : '✕';
};

export const initDebugConsole = () => {
  renderLogs();
};
