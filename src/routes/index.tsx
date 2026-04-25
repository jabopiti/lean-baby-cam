import { createFileRoute, Link } from "@tanstack/react-router";
import { Baby, Eye, Lock, Wifi, Zap } from "lucide-react";
import { primeAudio } from "@/lib/audioAlerts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lean Baby Monitor — Pair in seconds, no account" },
      {
        name: "description",
        content: "Turn two browsers into a private baby monitor. Peer-to-peer audio + video, no signup, no recording.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gradient-night)" }}>
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(circle at 50% 0%, oklch(0.82 0.14 75 / 0.15), transparent 60%)" }}
          aria-hidden
        />
        <div className="relative z-10 w-full max-w-md">
          <div className="mb-2 flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center shadow-[var(--shadow-glow)]">
              <span className="text-3xl">🌙</span>
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
            Lean Baby Monitor
          </h1>
          <p className="mt-3 text-base text-muted-foreground max-w-sm mx-auto">
            Two browsers. One private connection. No accounts, no recordings, no fuss.
          </p>

          <div className="mt-10 grid gap-4">
            <Link
              to="/baby"
              onClick={() => primeAudio()}
              className="group relative overflow-hidden rounded-2xl bg-card hover:bg-card/80 border border-border p-6 text-left transition-all hover:shadow-[var(--shadow-glow)] hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <Baby className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="text-lg font-semibold text-foreground">I'm the Baby Device</div>
                  <div className="text-sm text-muted-foreground">Camera & mic stay here. Generates a PIN to scan.</div>
                </div>
              </div>
            </Link>

            <Link
              to="/parent"
              onClick={() => primeAudio()}
              className="group relative overflow-hidden rounded-2xl bg-card hover:bg-card/80 border border-border p-6 text-left transition-all hover:shadow-[var(--shadow-glow)] hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                  <Eye className="w-7 h-7 text-accent" />
                </div>
                <div className="flex-1">
                  <div className="text-lg font-semibold text-foreground">I'm the Parent Device</div>
                  <div className="text-sm text-muted-foreground">Watch and listen. Scan QR or enter PIN.</div>
                </div>
              </div>
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-3 text-xs text-muted-foreground">
            <Feature icon={Lock} label="End-to-end private" />
            <Feature icon={Wifi} label="Local Wi-Fi or remote" />
            <Feature icon={Zap} label="Low battery mode" />
          </div>
        </div>
      </main>
      <footer className="relative z-10 py-4 text-center text-xs text-muted-foreground">
        Use over HTTPS · Allow camera/mic on the Baby Device
      </footer>
    </div>
  );
}

function Feature({ icon: Icon, label }: { icon: typeof Lock; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-card/40 border border-border/50">
      <Icon className="w-4 h-4 text-primary" />
      <span>{label}</span>
    </div>
  );
}
