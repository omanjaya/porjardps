// Privacy-friendly page-view tracker. No cookies, no third-party SDK.
// Users can opt out by setting localStorage['analytics_optout'] = '1'.

const ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL ?? ""}/analytics/pageview`;

function optedOut(): boolean {
  try {
    return localStorage.getItem("analytics_optout") === "1";
  } catch {
    return false;
  }
}

export function trackPageView(path: string): void {
  if (typeof window === "undefined") return;
  if (optedOut()) return;

  const payload = {
    path,
    referrer: document.referrer || "",
    user_agent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  };

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
    // silent — analytics must never break UX
  }
}
