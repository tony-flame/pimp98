/** WebAudio blips. Nothing streams, nothing is fetched. */

let ctx: AudioContext | null = null;
let enabled = true;

function audio(): AudioContext | null {
  if (!enabled) return null;
  if (ctx) return ctx;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

export function setSoundEnabled(value: boolean): void {
  enabled = value;
}

export function resumeAudio(): void {
  const c = audio();
  if (c && c.state === 'suspended') void c.resume();
}

interface Tone {
  freq: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  slideTo?: number;
}

function play(tones: Tone[]): void {
  const c = audio();
  if (!c) return;
  const now = c.currentTime;
  for (const tone of tones) {
    const start = now + (tone.delay ?? 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = tone.type ?? 'square';
    osc.frequency.setValueAtTime(tone.freq, start);
    if (tone.slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, tone.slideTo), start + tone.dur);
    }
    const peak = tone.gain ?? 0.045;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.dur);
    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(start + tone.dur + 0.02);
  }
}

export const sfx = {
  click(): void {
    play([{ freq: 880, dur: 0.035, gain: 0.02 }]);
  },
  open(): void {
    play([
      { freq: 440, dur: 0.06, gain: 0.03 },
      { freq: 660, dur: 0.06, gain: 0.03, delay: 0.05 },
    ]);
  },
  close(): void {
    play([
      { freq: 660, dur: 0.05, gain: 0.025 },
      { freq: 330, dur: 0.07, gain: 0.025, delay: 0.045 },
    ]);
  },
  error(): void {
    play([
      { freq: 220, dur: 0.12, gain: 0.04, type: 'sawtooth' },
      { freq: 180, dur: 0.16, gain: 0.04, type: 'sawtooth', delay: 0.1 },
    ]);
  },
  money(): void {
    play([
      { freq: 1046, dur: 0.07, gain: 0.035 },
      { freq: 1318, dur: 0.07, gain: 0.035, delay: 0.07 },
      { freq: 1568, dur: 0.12, gain: 0.035, delay: 0.14 },
    ]);
  },
  alarm(): void {
    play([
      { freq: 520, dur: 0.18, gain: 0.05, type: 'sawtooth', slideTo: 300 },
      { freq: 520, dur: 0.18, gain: 0.05, type: 'sawtooth', slideTo: 300, delay: 0.24 },
    ]);
  },
  chime(): void {
    play([
      { freq: 523, dur: 0.12, gain: 0.03, type: 'triangle' },
      { freq: 784, dur: 0.2, gain: 0.03, type: 'triangle', delay: 0.12 },
    ]);
  },
};
