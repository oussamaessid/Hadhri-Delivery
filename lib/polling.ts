// One request at a time; hidden/offline pages do not keep polling.
export function startPolling(task: (signal: AbortSignal) => Promise<unknown>, interval: number) {
  let stopped = false, running = false, failures = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const controller = new AbortController();
  const available = () => !document.hidden && navigator.onLine !== false;
  async function run() {
    clearTimeout(timer);
    if (stopped || running || !available()) return;
    running = true;
    try { await task(controller.signal); failures = 0; }
    catch { failures = Math.min(failures + 1, 4); }
    finally {
      running = false;
      if (!stopped && available()) timer = setTimeout(run, Math.min(interval * 2 ** failures, 60000));
    }
  }
  const wake = () => { void run(); };
  document.addEventListener('visibilitychange', wake);
  window.addEventListener('focus', wake);
  window.addEventListener('online', wake);
  window.addEventListener('offline', wake);
  void run();
  return () => {
    stopped = true;
    clearTimeout(timer);
    controller.abort();
    document.removeEventListener('visibilitychange', wake);
    window.removeEventListener('focus', wake);
    window.removeEventListener('online', wake);
    window.removeEventListener('offline', wake);
  };
}
