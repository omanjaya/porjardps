// Lightweight client-side error reporter. Captures window errors and
// unhandled promise rejections, POSTs them to the backend, and is rate-limited
// to 10 reports per minute per browser session. No external SDK.

const ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL ?? ""}/errors/report`;
const LIMIT = 10;
const WINDOW_MS = 60_000;

let installed = false;
const timestamps: number[] = [];

function allow(): boolean {
  const now = Date.now();
  while (timestamps.length && now - timestamps[0] > WINDOW_MS) timestamps.shift();
  if (timestamps.length >= LIMIT) return false;
  timestamps.push(now);
  return true;
}

function send(payload: Record<string, unknown>) {
  if (!allow()) return;
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
    } else {
      void fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    }
  } catch {
    // swallow — reporter must never throw
  }
}

export function installErrorReporter(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (e) => {
    send({
      message: e.message || "window.onerror",
      stack: e.error?.stack || "",
      url: window.location.href,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    send({
      message: typeof reason === "string" ? reason : reason?.message || "unhandledrejection",
      stack: reason?.stack || "",
      url: window.location.href,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  });
}
