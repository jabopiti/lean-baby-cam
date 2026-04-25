import { useEffect, useState } from "react";

export function SessionTimer({ startedAt }: { startedAt: number | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [startedAt]);
  if (!startedAt) return <span className="font-mono tabular-nums text-sm">00:00</span>;
  const s = Math.floor((now - startedAt) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const fmt = (n: number) => n.toString().padStart(2, "0");
  return (
    <span className="font-mono tabular-nums text-sm">
      {h > 0 ? `${fmt(h)}:` : ""}{fmt(m)}:{fmt(sec)}
    </span>
  );
}
