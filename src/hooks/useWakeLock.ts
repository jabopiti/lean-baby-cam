import { useEffect, useRef } from "react";

export function useWakeLock(active: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    const acquire = async () => {
      try {
        if ("wakeLock" in navigator) {
          const sentinel = await navigator.wakeLock.request("screen");
          if (cancelled) {
            await sentinel.release();
            return;
          }
          sentinelRef.current = sentinel;
          sentinel.addEventListener("release", () => {
            sentinelRef.current = null;
          });
        }
      } catch {
        // permission/visibility denial — silent
      }
    };

    void acquire();

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !sentinelRef.current) {
        void acquire();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      const s = sentinelRef.current;
      sentinelRef.current = null;
      if (s) void s.release().catch(() => {});
    };
  }, [active]);
}
