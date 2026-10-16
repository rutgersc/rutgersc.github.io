const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

let now = 0;
let nextTimer = 0;
let stopped = 0;
const timers = new Map();
const storage = new Map([['sleep-minutes', '15']]);
const elements = Object.fromEntries(['sleep-timer', 'sleep-minutes', 'sleep-start', 'sleep-cancel', 'sleep-status'].map(id => [id, {
  value: '30',
  valid: true,
  listeners: {},
  addEventListener(name, handler) { this.listeners[name] = handler; },
  reportValidity() { return this.valid; }
}]));
const listeners = {};
const context = vm.createContext({
  document: {
    getElementById: id => elements[id],
    addEventListener: (name, handler) => { listeners[name] = handler; }
  },
  localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
  Date: { now: () => now },
  setInterval: callback => { timers.set(++nextTimer, callback); return nextTimer; },
  clearInterval: id => timers.delete(id)
});
vm.runInContext(fs.readFileSync('dist/sleep-timer.js', 'utf8').replace('export function', 'function'), context);
context.initSleepTimer(() => stopped++);
const submit = () => elements['sleep-timer'].listeners.submit({ preventDefault() {} });
const tick = () => [...timers.values()].map(callback => callback());
assert.equal(elements['sleep-minutes'].value, '15');
assert.equal(timers.size, 0);
elements['sleep-minutes'].value = '1';
submit();
assert.equal(elements['sleep-status'].textContent, 'Turns off in 1:00');
now = 59_000;
tick();
assert.equal(stopped, 0);
submit();
assert.equal(timers.size, 1);
now = 60_000;
tick();
assert.equal(stopped, 0);
elements['sleep-cancel'].listeners.click();
now = 120_000;
tick();
assert.equal(stopped, 0);
assert.equal(timers.size, 0);
elements['sleep-timer'].valid = false;
submit();
assert.equal(timers.size, 0);
elements['sleep-timer'].valid = true;
submit();
now = 190_000;
listeners.visibilitychange();
tick();
assert.equal(stopped, 1);
assert.equal(timers.size, 0);
assert.equal(elements['sleep-cancel'].disabled, true);
assert.equal(storage.get('sleep-minutes'), '1');
console.log('Sleep timer checks passed: restore, start, restart, cancel, invalid input, overdue expiry, single callback.');
