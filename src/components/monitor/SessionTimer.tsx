import { useEffect, useRef, useState } from "react";

const LONG_PRESS_MS = 1500;
const MOVE_TOLERANCE_PX = 10;

interface SessionTimerProps {
  startedAt: number | null;
  /** Fires after a 1.5 s sustained press without movement. Used to toggle the diagnostics overlay. */
  onLongPress?: () => void;
  className?: string;
}

export function SessionTimer({ startedAt, onLongPress, className }: SessionTimerProps) {
  const [now, setNow] = useState(Date.now());
  const timerRef = useRef<number | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!startedAt) return;
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [startedAt]);

  const cancelPress = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPosRef.current = null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!onLongPress) return;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      onLongPress();
    }, LONG_PRESS_MS);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const start = startPosRef.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.sqrt(dx * dx + dy * dy) > MOVE_TOLERANCE_PX) cancelPress();
  };

  const label = (() => {
    if (!startedAt) return "00:00";
    const s = Math.floor((now - startedAt) / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const fmt = (n: number) => n.toString().padStart(2, "0");
    return `${h > 0 ? `${fmt(h)}:` : ""}${fmt(m)}:${fmt(sec)}`;
  })();

  const baseClass = `font-mono tabular-nums text-sm select-none ${className ?? ""}`;

  if (!onLongPress) {
    return <span className={baseClass}>{label}</span>;
  }
  return (
    <span
      className={`${baseClass} cursor-pointer touch-none`}
      role="button"
      tabIndex={-1}
      title="Long-press to toggle diagnostics"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={cancelPress}
      onPointerCancel={cancelPress}
      onPointerLeave={cancelPress}
    >
      {label}
    </span>
  );
}
