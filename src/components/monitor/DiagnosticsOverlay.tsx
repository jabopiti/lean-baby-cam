import { X } from "lucide-react";
import type { ConnectionState, StatsSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DiagnosticsOverlayProps {
  stats: StatsSnapshot | null;
  state: ConnectionState;
  onClose: () => void;
}

const fmtMs = (n: number | null) => (n === null ? "—" : `${n} ms`);
const fmtPct = (n: number | null) => (n === null ? "—" : `${n}%`);
const fmtKbps = (n: number | null) => (n === null ? "—" : `${n} kbps`);
const fmtCand = (s: string | null) => s ?? "—";

type RouteTone = "green" | "blue" | "amber" | "muted";
const TONE_BG: Record<RouteTone, string> = {
  green: "bg-emerald-400",
  blue: "bg-sky-400",
  amber: "bg-amber-400",
  muted: "bg-white/30",
};

function describeRoute(
  local: string | null,
  remote: string | null,
): { label: string; tone: RouteTone } {
  if (!local || !remote) return { label: "—", tone: "muted" };
  if (local === "relay" || remote === "relay") return { label: "Relayed (cloud)", tone: "amber" };
  if (local === "host" && remote === "host") return { label: "LAN (same network)", tone: "green" };
  return { label: "Direct P2P", tone: "blue" };
}

export function DiagnosticsOverlay({ stats, state, onClose }: DiagnosticsOverlayProps) {
  const route = describeRoute(stats?.localCandidateType ?? null, stats?.remoteCandidateType ?? null);
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
        <dt className="text-white/50">Route</dt>
        <dd className="text-white text-right flex items-center justify-end gap-1.5">
          <span className={cn("inline-block w-2 h-2 rounded-full", TONE_BG[route.tone])} />
          <span>{route.label}</span>
        </dd>
        <Row label="State" value={state} mono />
        <Row label="ICE" value={stats?.iceConnectionState ?? "—"} mono />
        <Row
          label="Candidates"
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
