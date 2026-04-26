import { X } from "lucide-react";
import type { ConnectionState, StatsSnapshot } from "@/lib/types";

interface DiagnosticsOverlayProps {
  stats: StatsSnapshot | null;
  state: ConnectionState;
  onClose: () => void;
}

const fmtMs = (n: number | null) => (n === null ? "—" : `${n} ms`);
const fmtPct = (n: number | null) => (n === null ? "—" : `${n}%`);
const fmtKbps = (n: number | null) => (n === null ? "—" : `${n} kbps`);
const fmtCand = (s: string | null) => s ?? "—";

export function DiagnosticsOverlay({ stats, state, onClose }: DiagnosticsOverlayProps) {
  return (
    <div className="fixed bottom-4 left-4 z-50 w-[230px] rounded-xl border border-white/10 bg-black/75 backdrop-blur-md text-white font-mono text-[11px] shadow-xl animate-fade-in">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="uppercase tracking-widest text-[10px] text-white/60">Diagnostics</span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/10"
          aria-label="Close diagnostics overlay"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <dl className="px-3 py-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <Row label="State" value={state} mono />
        <Row label="ICE" value={stats?.iceConnectionState ?? "—"} mono />
        <Row
          label="Pair"
          value={`${fmtCand(stats?.localCandidateType ?? null)} / ${fmtCand(stats?.remoteCandidateType ?? null)}`}
          mono
        />
        <Row label="RTT" value={fmtMs(stats?.rttMs ?? null)} mono />
        <Row label="Bitrate" value={fmtKbps(stats?.bitrateKbps ?? null)} mono />
        <Row label="Loss" value={fmtPct(stats?.packetLossPct ?? null)} mono />
        <Row label="Jitter" value={fmtMs(stats?.jitterMs ?? null)} mono />
      </dl>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <dt className="text-white/50">{label}</dt>
      <dd className={mono ? "text-white text-right tabular-nums" : "text-white text-right"}>
        {value}
      </dd>
    </>
  );
}
