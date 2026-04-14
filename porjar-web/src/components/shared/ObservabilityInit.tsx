"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { installErrorReporter } from "@/lib/errorReporter";
import { trackPageView } from "@/lib/analytics";

// ObservabilityInit wires up the two lightweight client-side observability
// pieces: global error capture and per-navigation page-view tracking.
// Rendered once from the root layout.
export function ObservabilityInit() {
  const pathname = usePathname();

  useEffect(() => {
    installErrorReporter();
  }, []);

  useEffect(() => {
    if (pathname) trackPageView(pathname);
  }, [pathname]);

  return null;
}
