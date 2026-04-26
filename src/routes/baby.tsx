import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Camera, RefreshCw, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BabySession } from "@/lib/peerManager";
import { generateSecurePin, generateSharedSecret, encodePairingPayload } from "@/lib/pairing";
import { primeAudio } from "@/lib/audioAlerts";
import type { ConnectionState } from "@/lib/types";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useAudioLevel } from "@/hooks/useAudioLevel";
import { AudioMeter } from "@/components/monitor/AudioMeter";
import { StatusPill } from "@/components/monitor/StatusPill";
import { SessionTimer } from "@/components/monitor/SessionTimer";
import { EndSessionDialog } from "@/components/monitor/EndSessionDialog";

export const Route = createFileRoute("/baby")({
  head: () => ({
    meta: [
      { title: "Baby Device — Lean Baby Monitor" },
      { name: "description", content: "Pair this device as the baby monitor source." },
    ],
  }),
  component: BabyPage,
});

type Phase = "permission" | "denied" | "pairing" | "monitoring";

function BabyPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("permission");
  const [pin, setPin] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [state, setState] = useState<ConnectionState>("IDLE");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [endOpen, setEndOpen] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [dimmed, setDimmed] = useState(false);
  const sessionRef = useRef<BabySession | null>(null);
  const dimTimerRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const audioLevel = useAudioLevel(stream);
  useWakeLock(phase === "pairing" || phase === "monitoring");

  // Get media + start peer
  const requestPermissions = useCallback(async () => {
    setErrorMsg(null);
    primeAudio();
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 854 }, height: { ideal: 480 }, frameRate: { ideal: 15 } },
        audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true },
      });
      setStream(s);
      const newPin = generateSecurePin();
      const newSecret = generateSharedSecret();
      setPin(newPin);
      setSecret(newSecret);
      setPhase("pairing");

      const session = new BabySession(newPin, newSecret, s, {
        onState: (st) => {
          setState(st);
          if (st === "CONNECTED" && startedAtRef.current === null) {
            const t = Date.now();
            startedAtRef.current = t;
            setStartedAt(t);
            setPhase("monitoring");
          }
        },
        onError: (msg) => setErrorMsg(msg),
        onSessionEnded: () => {
          // Parent ended — clean up and return home
          sessionRef.current?.end();
          sessionRef.current = null;
          void navigate({ to: "/" });
        },
      });
      sessionRef.current = session;
      try {
        await session.start();
      } catch {
        // error is surfaced via onError
      }
    } catch (err) {
      const e = err as DOMException;
      if (e.name === "NotAllowedError" || e.name === "SecurityError") {
        setPhase("denied");
      } else if (e.name === "NotFoundError") {
        setErrorMsg("No camera or microphone found on this device.");
        setPhase("denied");
      } else {
        setErrorMsg(e.message || "Could not access camera and microphone.");
        setPhase("denied");
      }
    }
  }, [navigate]);

  const startedAtRef = useRef<number | null>(null);

  // Show local video preview
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, phase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sessionRef.current?.end();
      sessionRef.current = null;
    };
  }, []);

  // Dim screen after 30s of no interaction during monitoring
  const resetDim = useCallback(() => {
    setDimmed(false);
    if (dimTimerRef.current !== null) window.clearTimeout(dimTimerRef.current);
    if (phase === "monitoring") {
      dimTimerRef.current = window.setTimeout(() => setDimmed(true), 30_000);
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "monitoring") return;
    resetDim();
    const handler = () => resetDim();
    window.addEventListener("touchstart", handler);
    window.addEventListener("mousedown", handler);
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("touchstart", handler);
      window.removeEventListener("mousedown", handler);
      window.removeEventListener("keydown", handler);
      if (dimTimerRef.current !== null) window.clearTimeout(dimTimerRef.current);
    };
  }, [phase, resetDim]);

  const confirmEnd = () => {
    sessionRef.current?.end();
    sessionRef.current = null;
    setEndOpen(false);
    void navigate({ to: "/" });
  };

  // ===== Render =====

  if (phase === "permission") {
    return (
      <Shell>
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/15 flex items-center justify-center">
            <Camera className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Camera & microphone access</h1>
          <p className="mt-2 text-muted-foreground">
            We need both to stream live audio and video to the Parent Device. Nothing is recorded or sent to a server.
          </p>
          <Button size="lg" className="mt-8 w-full" onClick={requestPermissions}>
            Allow camera & mic
          </Button>
          <Link to="/" className="block mt-4 text-sm text-muted-foreground hover:text-foreground">
            ← Back
          </Link>
        </div>
      </Shell>
    );
  }

  if (phase === "denied") {
    return (
      <Shell>
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-foreground">Permissions blocked</h1>
          <p className="mt-2 text-muted-foreground">
            {errorMsg ?? "Camera and microphone access are required for the Baby Device."}
          </p>
          <div className="mt-6 text-left text-sm text-muted-foreground bg-card border border-border rounded-lg p-4 space-y-2">
            <p className="font-semibold text-foreground">How to grant access:</p>
            <p><strong>iPhone (Safari):</strong> Settings → Safari → Camera/Microphone → Allow.</p>
            <p><strong>Android (Chrome):</strong> Tap the lock icon in the address bar → Permissions → Allow.</p>
            <p><strong>Desktop:</strong> Click the lock/camera icon in the address bar → Allow.</p>
          </div>
          <Button size="lg" className="mt-6 w-full" onClick={requestPermissions}>
            <RefreshCw className="w-4 h-4" /> Try again
          </Button>
          <Link to="/" className="block mt-4 text-sm text-muted-foreground hover:text-foreground">
            ← Back
          </Link>
        </div>
      </Shell>
    );
  }

  if (phase === "pairing") {
    return (
      <Shell>
        <div className="max-w-md mx-auto text-center">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4" /> Cancel
          </Link>
          <StatusPill state={state} className="mx-auto" />
          <h1 className="mt-4 text-2xl font-bold text-foreground">Ready to pair</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Open the app on the Parent Device and scan this code, or enter the PIN.
          </p>
          {errorMsg && (
            <div className="mt-3 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              {errorMsg}
            </div>
          )}
          <div className="mt-6 bg-card rounded-2xl p-6 border border-border shadow-[var(--shadow-soft)]">
            <div className="bg-white p-4 rounded-xl inline-block">
              <QRCodeSVG value={encodePairingPayload(pin, secret)} size={200} level="M" />
            </div>
            <div className="mt-5">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">PIN</div>
              <div className="mt-1 font-mono text-4xl font-bold text-primary tracking-[0.3em]">
                {pin.match(/.{1,3}/g)?.join(" ")}
              </div>
              <div className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">Code</div>
              <div className="mt-1 font-mono text-2xl font-bold text-foreground tracking-[0.4em]">
                {secret}
              </div>
            </div>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            This PIN is fresh for this session and stops working when you end it.
          </p>
        </div>
      </Shell>
    );
  }

  // monitoring
  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{ background: "var(--gradient-night)" }}
      onClick={resetDim}
    >
      <header className="px-6 py-4 flex items-center justify-between border-b border-border/50">
        <StatusPill state={state} />
        <SessionTimer startedAt={startedAt} />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-6">
        <div className="text-center">
          <div className="text-sm uppercase tracking-widest text-muted-foreground">Streaming to parent</div>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Monitoring active</h1>
        </div>

        <div className="relative w-full max-w-sm aspect-video rounded-2xl overflow-hidden bg-black border border-border shadow-[var(--shadow-soft)]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/60 text-[10px] uppercase tracking-wider text-white/80">
            preview
          </div>
        </div>

        <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">Mic level</span>
            <span className="text-xs text-muted-foreground">echo cancel on · noise suppress off</span>
          </div>
          <AudioMeter level={audioLevel} bars={20} className="h-10" />
        </div>
      </main>

      <footer className="p-6">
        <Button
          variant="destructive"
          size="lg"
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            setEndOpen(true);
          }}
        >
          <Power className="w-5 h-5" /> End session
        </Button>
      </footer>

      {/* Dim overlay */}
      <div
        className={`pointer-events-none absolute inset-0 bg-black transition-opacity duration-700 ${
          dimmed ? "opacity-95" : "opacity-0"
        }`}
        aria-hidden
      >
        <div className={`absolute bottom-6 left-0 right-0 text-center text-xs ${dimmed ? "text-white/40" : "opacity-0"}`}>
          Tap anywhere to wake
        </div>
      </div>

      <EndSessionDialog open={endOpen} onOpenChange={setEndOpen} onConfirm={confirmEnd} />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10" style={{ background: "var(--gradient-night)" }}>
      {children}
    </div>
  );
}
