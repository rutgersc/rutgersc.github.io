export function initSleepTimer(turnOffVideo: () => void): void {
  const form = document.getElementById('sleep-timer') as HTMLFormElement;
  const minutes = document.getElementById('sleep-minutes') as HTMLInputElement;
  const start = document.getElementById('sleep-start') as HTMLButtonElement;
  const cancel = document.getElementById('sleep-cancel') as HTMLButtonElement;
  const status = document.getElementById('sleep-status')!;
  const savedMinutes = Number(localStorage.getItem('sleep-minutes'));
  if (Number.isInteger(savedMinutes) && savedMinutes >= 1 && savedMinutes <= 1440) {
    minutes.value = String(savedMinutes);
  }

  let deadline: number | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;

  const stop = (message: string): void => {
    clearInterval(timer);
    deadline = undefined;
    cancel.disabled = true;
    start.textContent = 'Start';
    status.textContent = message;
  };

  const update = (): void => {
    if (deadline === undefined) return;
    const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    if (remaining === 0) {
      stop('Sleep timer finished. Video turned off.');
      turnOffVideo();
      return;
    }
    status.textContent = `Turns off in ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
  };

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    clearInterval(timer);
    localStorage.setItem('sleep-minutes', minutes.value);
    deadline = Date.now() + Number(minutes.value) * 60_000;
    cancel.disabled = false;
    start.textContent = 'Restart';
    update();
    timer = setInterval(update, 1000);
  });
  cancel.addEventListener('click', () => stop('Sleep timer off.'));
  document.addEventListener('visibilitychange', update);
}
