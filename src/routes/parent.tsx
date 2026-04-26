import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { ArrowLeft, ScanLine, KeyRound, Power, Volume2, VolumeX, BellOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ParentSession } from "@/lib/peerManager";
import { parsePairingPayload, normalizeSecret } from "@/lib/pairing";
import { primeAudio, stopAlarm, stopSoftChime } from "@/lib/audioAlerts";
import type { ConnectionState } from "@/lib/types";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useAudioLevel } from "@/hooks/useAudioLevel";
import { AudioMeter } from "@/components/monitor/AudioMeter";
import { Waveform } from "@/components/monitor/Waveform";
import { StatusPill } from "@/components/monitor/StatusPill";
import { SessionTimer } from "@/components/monitor/SessionTimer";
import { EndSessionDialog } from "@/components/monitor/EndSessionDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/parent")({
  head: () => ({
    meta: [
      { title: "Parent Device — Lean Baby Monitor" },
      { name: "description", content: "Connect to the Baby Device to start watching." },
    ],
  }),
  component: ParentPage,
});

type Phase = "pair" | "connecting" | "active";

function ParentPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("pair");
  const [pinDigits, setPinDigits] = useState("");
  const [codeChars, setCodeChars] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [strikes, setStrikes] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number>(0);
  const [muted, setMuted] = useState(false);

  const [state, setState] = useState<ConnectionState>("IDLE");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [endOpen, setEndOpen] = useState(false);
  const [lowBw, setLowBw] = useState<{ low: boolean; at: Date | null }>({ low: false, at: null });
  const [showRestored, setShowRestored] = useState(false);

  const sessionRef = useRef<ParentSession | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const qrRef = useRef<Html5Qrcode | null>(null);
  const prevStateRef = useRef<ConnectionState>("IDLE");

  const audioLevel = useAudioLevel(remoteStream);
  useWakeLock(phase !== "pair");

  useEffect(() => {
    if (
      (prevStateRef.current === "RECONNECTING_SILENT" ||
        prevStateRef.current === "RECONNECTING_WARN" ||
        prevStateRef.current === "CONNECTION_LOST") &&
      state === "CONNECTED"
    ) {
      setShowRestored(true);
      const t = window.setTimeout(() => setShowRestored(false), 5000);
      return () => window.clearTimeout(t);
    }
    prevStateRef.current = state;
  }, [state]);

  const startSession = useCallback(
    async (pin: string, secret: string) => {
      setErrorMsg(null);
      primeAudio();
      setPhase("connecting");
      const session = new ParentSession({
        onState: (st) => setState(st),
        onRemoteStream: (s) => {
          setRemoteStream(s);
          if (s && startedAt === null) {
            const t = Date.now();
            setStartedAt(t);
            setPhase("active");
          }
        },
        onLowBandwidth: (low, at) => setLowBw({ low, at }),
        onWarning: (msg) => {
          console.warn("[parent]", msg);
          toast.warning("Relay unavailable — cross-network sessions may not connect.");
        },
        onError: (msg) => {
          setErrorMsg(msg);
          setPhase("pair");
          setStrikes((s) => s + 1);
        },
        onSessionEnded: () => {
          sessionRef.current?.end();
          sessionRef.current = null;
          void navigate({ to: "/" });
        },
      });
      sessionRef.current = session;
      try {
        await session.connect(pin, secret);
      } catch {
        // surfaced via onError
      }
    },
    [navigate, startedAt],
  );

  // 3-strike lockout
  useEffect(() => {
    if (strikes >= 3) {
      setLockedUntil(Date.now() + 30_000);
      setStrikes(0);
    }
  }, [strikes]);

  useEffect(() => {
    if (lockedUntil === 0) return;
    const t = window.setInterval(() => {
      if (Date.now() >= lockedUntil) setLockedUntil(0);
    }, 500);
    return () => window.clearInterval(t);
  }, [lockedUntil]);

  // Bind remote stream to video element
  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
      videoRef.current.muted = muted;
    }
    // Mirror remote audio to a dedicated <audio> element so iOS/Android
    // keep the audio link alive when the tab is backgrounded or the screen
    // is locked. Video element is muted to avoid double playback.
    if (audioRef.current && remoteStream) {
      audioRef.current.srcObject = remoteStream;
      audioRef.current.muted = muted;
    }
  }, [remoteStream, muted, lowBw.low]);

  // QR scanner setup (only when pair tab + scan tab visible)
  const startQr = useCallback(async () => {
    if (qrRef.current) return;
    try {
      const el = document.getElementById("qr-reader");
      if (!el) return;
      const qr = new Html5Qrcode("qr-reader", { verbose: false });
      qrRef.current = qr;
      await qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decoded) => {
          const { pin, secret } = parsePairingPayload(decoded);
          if (/^\d{6}$/.test(pin) && secret && secret.length >= 4) {
            void stopQr();
            void startSession(pin, secret);
          }
        },
        () => {
          // ignore decode failures
        },
      );
    } catch (e) {
      const err = e as Error;
      setErrorMsg(`Camera unavailable: ${err.message}. Use the PIN tab instead.`);
    }
  }, [startSession]);

  const stopQr = useCallback(async () => {
    const qr = qrRef.current;
    qrRef.current = null;
    if (!qr) return;
    try {
      await qr.stop();
      qr.clear();
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    return () => {
      void stopQr();
      sessionRef.current?.end();
      sessionRef.current = null;
    };
  }, [stopQr]);

  const confirmEnd = () => {
    sessionRef.current?.end();
    sessionRef.current = null;
    setEndOpen(false);
    void navigate({ to: "/" });
  };

  const dismissAlarm = () => {
    stopAlarm();
    stopSoftChime();
  };

  // ===== Render =====

  if (phase === "pair") {
    const lockedSec = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000)) : 0;
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-10" style={{ background: "var(--gradient-night)" }}>
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Pair with Baby Device</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Scan the QR code on the other device, or type the 6-digit PIN.
          </p>

          {errorMsg && (
            <div className="mt-4 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              {errorMsg}
            </div>
          )}

          {lockedSec > 0 && (
            <div className="mt-4 text-sm text-warning bg-warning/10 border border-warning/30 rounded-lg p-3">
              Too many wrong PINs. Try again in {lockedSec}s.
            </div>
          )}

          <Tabs
            defaultValue="qr"
            className="mt-5"
            onValueChange={(v) => {
              if (v === "qr") void startQr();
              else void stopQr();
            }}
          >
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="qr"><ScanLine className="w-4 h-4 mr-2" />Scan QR</TabsTrigger>
              <TabsTrigger value="pin"><KeyRound className="w-4 h-4 mr-2" />Enter PIN</TabsTrigger>
            </TabsList>
            <TabsContent value="qr" className="mt-4">
              <div className="bg-card border border-border rounded-2xl p-4">
                <div id="qr-reader" className="rounded-xl overflow-hidden bg-black aspect-square" />
                <p className="mt-3 text-xs text-muted-foreground text-center">
                  Allow camera access if prompted. Hold steady on the QR code.
                </p>
                <QrAutoStart onMount={startQr} />
              </div>
            </TabsContent>
            <TabsContent value="pin" className="mt-4">
              <div className="bg-card border border-border rounded-2xl p-5">
                <label className="text-xs uppercase tracking-widest text-muted-foreground">PIN</label>
                <Input
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={pinDigits}
                  onChange={(e) => setPinDigits(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="mt-2 text-center text-3xl font-mono tracking-[0.4em] h-16"
                  disabled={lockedSec > 0}
                />
                <label className="text-xs uppercase tracking-widest text-muted-foreground mt-4 block">Code</label>
                <Input
                  inputMode="text"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={4}
                  placeholder="ABCD"
                  value={codeChars}
                  onChange={(e) => setCodeChars(normalizeSecret(e.target.value))}
                  className="mt-2 text-center text-2xl font-mono tracking-[0.4em] h-14 uppercase"
                  disabled={lockedSec > 0}
                />
                <p className="mt-2 text-xs text-muted-foreground">Shown beneath the PIN on the Baby Device.</p>
                <Button
                  size="lg"
                  className="mt-4 w-full"
                  disabled={pinDigits.length !== 6 || codeChars.length !== 4 || lockedSec > 0}
                  onClick={() => startSession(pinDigits, codeChars)}
                >
                  Connect
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  if (phase === "connecting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-4" style={{ background: "var(--gradient-night)" }}>
        <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        <div className="text-foreground font-medium">Connecting…</div>
        <p className="text-sm text-muted-foreground">Establishing peer-to-peer link</p>
      </div>
    );
  }

  // active
  const showVideo = !lowBw.low && !!remoteStream;

  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Video / waveform */}
      <div className="relative flex-1 bg-black overflow-hidden">
        {showVideo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-contain"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-card">
            <div className="text-xs uppercase tracking-widest text-warning mb-2">Audio only</div>
            <div className="w-full max-w-2xl h-32 px-6">
              <Waveform stream={remoteStream} />
            </div>
            {lowBw.at && (
              <div className="mt-4 text-sm text-muted-foreground">
                Video signal dropped at{" "}
                {lowBw.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            )}
          </div>
        )}

        {/* Top overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent">
          <StatusPill state={state} />
          <div className="flex items-center gap-3 text-white/90">
            <SessionTimer startedAt={startedAt} />
            <button
              onClick={() => setMuted((m) => !m)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Audio meter overlay */}
        {showVideo && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur px-4 py-2 rounded-full">
            <AudioMeter level={audioLevel} bars={16} className="h-6" />
          </div>
        )}

        {/* Reconnecting / lost banners */}
        {(state === "RECONNECTING_SILENT" || state === "RECONNECTING_WARN") && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-warning/95 text-warning-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg" style={{ color: "oklch(0.18 0.04 265)" }}>
            {state === "RECONNECTING_WARN" ? "Still trying to reach baby…" : "Reconnecting…"}
          </div>
        )}
        {state === "CONNECTION_LOST" && (
          <div className="absolute inset-0 bg-destructive/90 flex flex-col items-center justify-center gap-4 z-10">
            <div className="text-white text-3xl font-bold tracking-wide">MONITOR DISCONNECTED</div>
            <p className="text-white/80 text-sm">No signal for over 60 seconds.</p>
            <Button size="lg" variant="secondary" onClick={dismissAlarm}>
              <BellOff className="w-5 h-5" /> Dismiss alarm
            </Button>
          </div>
        )}

        {/* Connection restored toast */}
        {showRestored && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-success text-background px-4 py-2 rounded-full text-sm font-medium shadow-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Connection restored
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="p-4 bg-card border-t border-border">
        <Button
          variant="destructive"
          size="lg"
          className="w-full"
          onClick={() => setEndOpen(true)}
        >
          <Power className="w-5 h-5" /> End session
        </Button>
      </div>

      <EndSessionDialog open={endOpen} onOpenChange={setEndOpen} onConfirm={confirmEnd} />
      {/* Hidden persistent audio element — keeps audio alive when tab backgrounds. */}
      <audio ref={audioRef} autoPlay playsInline className="hidden" />
    </div>
  );
}

function QrAutoStart({ onMount }: { onMount: () => void }) {
  useEffect(() => {
    onMount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
