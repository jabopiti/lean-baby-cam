import { useEffect, useRef } from "react";

interface WaveformProps {
  stream: MediaStream | null;
}

/** Animated audio waveform shown when video is dropped. */
export function Waveform({ stream }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stream) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    const ctx = new Ctor();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const buf = new Uint8Array(analyser.frequencyBinCount);

    let raf = 0;
    const draw = () => {
      const w = canvas.width = canvas.clientWidth * window.devicePixelRatio;
      const h = canvas.height = canvas.clientHeight * window.devicePixelRatio;
      analyser.getByteTimeDomainData(buf);
      ctx2d.clearRect(0, 0, w, h);
      ctx2d.lineWidth = 3 * window.devicePixelRatio;
      ctx2d.strokeStyle = "oklch(0.82 0.14 75)";
      ctx2d.shadowColor = "oklch(0.82 0.14 75 / 0.6)";
      ctx2d.shadowBlur = 12;
      ctx2d.beginPath();
      const slice = w / buf.length;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        const y = h / 2 + v * (h / 2) * 0.8;
        if (i === 0) ctx2d.moveTo(i * slice, y);
        else ctx2d.lineTo(i * slice, y);
      }
      ctx2d.stroke();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      try {
        source.disconnect();
        analyser.disconnect();
      } catch {
        // ignore
      }
      void ctx.close();
    };
  }, [stream]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}
