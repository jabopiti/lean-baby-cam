// Web Audio API-generated chime + alarm. No asset files needed.
// Audio context must be created after a user gesture (browser autoplay policy).

let ctx: AudioContext | null = null;
let alarmNode: { osc: OscillatorNode; gain: GainNode; lfo: OscillatorNode; lfoGain: GainNode } | null = null;
let chimeInterval: number | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function primeAudio(): void {
  // Call from a user gesture handler to unlock audio.
  try {
    getCtx();
  } catch {
    // ignore
  }
}

function playChime(): void {
  const c = getCtx();
  const now = c.currentTime;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
  gain.connect(c.destination);

  const o1 = c.createOscillator();
  o1.type = "sine";
  o1.frequency.setValueAtTime(660, now);
  o1.connect(gain);
  o1.start(now);
  o1.stop(now + 0.18);

  const o2 = c.createOscillator();
  o2.type = "sine";
  o2.frequency.setValueAtTime(880, now + 0.18);
  o2.connect(gain);
  o2.start(now + 0.18);
  o2.stop(now + 0.42);
}

export function startSoftChime(): void {
  if (chimeInterval !== null) return;
  playChime();
  chimeInterval = window.setInterval(playChime, 4000);
}

export function stopSoftChime(): void {
  if (chimeInterval !== null) {
    clearInterval(chimeInterval);
    chimeInterval = null;
  }
}

export function startAlarm(): void {
  if (alarmNode) return;
  const c = getCtx();
  const osc = c.createOscillator();
  osc.type = "square";
  osc.frequency.value = 770;

  // LFO modulates frequency between ~660 and ~880 (siren effect)
  const lfo = c.createOscillator();
  lfo.frequency.value = 4; // 4 Hz wail
  const lfoGain = c.createGain();
  lfoGain.gain.value = 110;
  lfo.connect(lfoGain).connect(osc.frequency);

  const gain = c.createGain();
  gain.gain.value = 0.35;

  osc.connect(gain).connect(c.destination);
  osc.start();
  lfo.start();
  alarmNode = { osc, gain, lfo, lfoGain };
}

export function stopAlarm(): void {
  if (!alarmNode) return;
  try {
    alarmNode.osc.stop();
    alarmNode.lfo.stop();
    alarmNode.osc.disconnect();
    alarmNode.lfo.disconnect();
    alarmNode.lfoGain.disconnect();
    alarmNode.gain.disconnect();
  } catch {
    // ignore
  }
  alarmNode = null;
}

export function stopAllAlerts(): void {
  stopSoftChime();
  stopAlarm();
}
