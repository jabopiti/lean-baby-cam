import { cn } from "@/lib/utils";
import type { ConnectionState } from "@/lib/types";
import { Wifi, WifiOff, Loader2, AlertTriangle } from "lucide-react";

const config: Record<ConnectionState, { label: string; tone: string; Icon: typeof Wifi }> = {
  IDLE: { label: "Idle", tone: "bg-muted text-muted-foreground", Icon: Wifi },
  PERMISSION_DENIED: { label: "Permission needed", tone: "bg-destructive/20 text-destructive", Icon: AlertTriangle },
  PAIRING: { label: "Waiting to pair", tone: "bg-accent/20 text-accent", Icon: Loader2 },
  CONNECTING: { label: "Connecting…", tone: "bg-accent/20 text-accent", Icon: Loader2 },
  CONNECTED: { label: "Connected", tone: "bg-success/20 text-success", Icon: Wifi },
  RECONNECTING_SILENT: { label: "Reconnecting…", tone: "bg-warning/20 text-warning", Icon: Loader2 },
  RECONNECTING_WARN: { label: "Still trying to reach baby…", tone: "bg-warning/30 text-warning", Icon: AlertTriangle },
  CONNECTION_LOST: { label: "MONITOR DISCONNECTED", tone: "bg-destructive text-destructive-foreground", Icon: WifiOff },
  ENDED: { label: "Session ended", tone: "bg-muted text-muted-foreground", Icon: WifiOff },
};

export function StatusPill({ state, className }: { state: ConnectionState; className?: string }) {
  const c = config[state];
  const spin = state === "CONNECTING" || state === "PAIRING" || state === "RECONNECTING_SILENT" || state === "RECONNECTING_WARN";
  return (
    <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium", c.tone, className)}>
      <c.Icon className={cn("w-3.5 h-3.5", spin && "animate-spin")} />
      <span>{c.label}</span>
    </div>
  );
}
