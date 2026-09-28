import { getAudioContext } from "@/lib/chat/chime";

export type RingtoneId = "bell" | "phone" | "chime" | "digital" | "alarm" | "siren";

type Note = {
  /** Seconds after the start of the cycle. */
  at: number;
  dur: number;
  freq: number;
  /** When set, the pitch glides from `freq` to this over the note. */
  freqEnd?: number;
  type: OscillatorType;
  gain: number;
  /** Hold the level for the whole note (harsh tones) instead of fading out (bells). */
  sustain?: boolean;
};

export type Ringtone = {
  id: RingtoneId;
  label: string;
  description: string;
  /** Length of one ring, including the pause before the next one. */
  cycleMs: number;
  notes: Note[];
};

/** A struck bell: the fundamental plus a bright overtone that dies quickly. */
function strike(at: number, freq: number): Note[] {
  return [
    { at, dur: 0.9, freq, type: "sine", gain: 0.55 },
    { at, dur: 0.35, freq: freq * 2.76, type: "sine", gain: 0.22 },
  ];
}

/** The old-fashioned trill: two pitches alternating very quickly. */
function trill(at: number): Note[] {
  return Array.from({ length: 8 }, (_, i) => ({
    at: at + i * 0.055,
    dur: 0.05,
    freq: i % 2 === 0 ? 1500 : 1200,
    type: "square" as const,
    gain: 0.3,
    sustain: true,
  }));
}

export const RINGTONES: Ringtone[] = [
  {
    id: "bell",
    label: "Bright Bell",
    description: "A clear double bell strike",
    cycleMs: 2200,
    notes: [...strike(0, 1046.5), ...strike(0.5, 1318.5)],
  },
  {
    id: "phone",
    label: "Classic Phone",
    description: "The old desk-phone ring",
    cycleMs: 2400,
    notes: [...trill(0), ...trill(0.6)],
  },
  {
    id: "chime",
    label: "Rising Chime",
    description: "Three notes climbing up",
    cycleMs: 2000,
    notes: [
      { at: 0, dur: 0.5, freq: 784, type: "sine", gain: 0.6 },
      { at: 0.18, dur: 0.5, freq: 987.8, type: "sine", gain: 0.6 },
      { at: 0.36, dur: 0.7, freq: 1318.5, type: "sine", gain: 0.6 },
    ],
  },
  {
    id: "digital",
    label: "Digital Beeps",
    description: "Sharp triple beep",
    cycleMs: 1600,
    notes: [0, 0.22, 0.44].map((at) => ({
      at,
      dur: 0.14,
      freq: 1760,
      type: "square" as const,
      gain: 0.3,
      sustain: true,
    })),
  },
  {
    id: "alarm",
    label: "Alarm Sweep",
    description: "A rising alarm wail",
    cycleMs: 1500,
    notes: [0, 0.7].map((at) => ({
      at,
      dur: 0.65,
      freq: 700,
      freqEnd: 1500,
      type: "sawtooth" as const,
      gain: 0.32,
      sustain: true,
    })),
  },
  {
    id: "siren",
    label: "Emergency Siren",
    description: "Two-tone siren, high and low",
    cycleMs: 1600,
    notes: [0, 0.4, 0.8, 1.2].map((at, i) => ({
      at,
      dur: 0.38,
      freq: i % 2 === 0 ? 960 : 770,
      type: "square" as const,
      gain: 0.3,
      sustain: true,
    })),
  },
];

export const RINGTONE_BY_ID = new Map(RINGTONES.map((tone) => [tone.id, tone]));

function scheduleCycle(ctx: AudioContext, out: AudioNode, tone: Ringtone) {
  const now = ctx.currentTime;
  for (const note of tone.notes) {
    const start = now + note.at;
    const end = start + note.dur;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = note.type;
    osc.frequency.setValueAtTime(note.freq, start);
    if (note.freqEnd) osc.frequency.linearRampToValueAtTime(note.freqEnd, end);

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(note.gain, start + 0.01);
    if (note.sustain) {
      gain.gain.setValueAtTime(note.gain, Math.max(start + 0.01, end - 0.02));
      gain.gain.linearRampToValueAtTime(0, end);
    } else {
      gain.gain.exponentialRampToValueAtTime(0.001, end);
    }

    osc.connect(gain);
    gain.connect(out);
    osc.start(start);
    osc.stop(end + 0.02);
  }
}

/**
 * Rings a tone until `stop()` is called, or for `cycles` rings when given.
 * Tones are synthesized with Web Audio (no audio files to ship), the same way
 * the message chime is. While the browser is still blocking audio a ring is
 * skipped rather than queued — queued rings would all burst out at once the
 * moment the owner clicks the page — and it doesn't count toward `cycles`,
 * so a finite alert still gets its full set of rings once sound is allowed.
 */
export function startRinging(
  id: RingtoneId,
  options: { volume: number; cycles?: number }
): () => void {
  const ctx = getAudioContext();
  if (!ctx) return () => {};

  const tone = RINGTONE_BY_ID.get(id) ?? RINGTONES[0];
  const master = ctx.createGain();
  master.gain.value = Math.min(1, Math.max(0, options.volume));
  master.connect(ctx.destination);

  let played = 0;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (timer) clearTimeout(timer);
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
    setTimeout(() => master.disconnect(), 400);
  };

  const ring = () => {
    if (stopped) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    if (ctx.state === "running") {
      scheduleCycle(ctx, master, tone);
      played += 1;
      if (options.cycles !== undefined && played >= options.cycles) {
        timer = setTimeout(stop, tone.cycleMs);
        return;
      }
    }
    timer = setTimeout(ring, tone.cycleMs);
  };

  ring();
  return stop;
}

/**
 * Browsers only let a page make sound after the person has clicked or typed
 * on it once. This listens for that first touch and switches audio on, so an
 * alert that arrives later can ring. Returns a cleanup function.
 */
export function installAudioUnlock(): () => void {
  const ctx = getAudioContext();
  const events = ["pointerdown", "keydown", "touchstart"] as const;

  const unlock = () => {
    ctx?.resume().catch(() => {});
    if (ctx?.state === "running") remove();
  };
  const remove = () => events.forEach((name) => window.removeEventListener(name, unlock));

  events.forEach((name) => window.addEventListener(name, unlock));
  return remove;
}

/** True while the browser is still refusing to play sound on this page. */
export function isAudioBlocked(): boolean {
  const ctx = getAudioContext();
  return !ctx || ctx.state !== "running";
}
