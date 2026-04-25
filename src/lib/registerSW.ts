/**
 * Service worker registration with strict guards:
 * - Never register inside iframes (Lovable editor preview)
 * - Never register on Lovable preview hostnames
 * - Unregister any pre-existing SW in those contexts to prevent stale caches
 * - Only registers in production builds
 */
export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    host.includes("lovable.app") === false && host.includes("lovable") ||
    host === "localhost";

  if (isInIframe || isPreviewHost) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
    return;
  }

  // Production registration via vite-plugin-pwa virtual module
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({ immediate: true });
    })
    .catch(() => {
      /* virtual module unavailable in dev */
    });
}