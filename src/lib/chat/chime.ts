let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  return audioCtx;
}

/**
 * Two-note ascending chime synthesized with Web Audio oscillators — no
 * audio asset to ship, and it works identically across the customer app,
 * staff app, and dashboard. Safe to call from a background poll: browsers
 * only block audio before any user gesture has happened on the page,
 * which is already true by the time these polls are running (the user
 * had to interact to log in).
 */
export function playMessageChime() {
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  [
    { freq: 880, start: 0, duration: 0.14 },
    { freq: 1174.66, start: 0.12, duration: 0.18 },
  ].forEach(({ freq, start, duration }) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + start);
    gain.gain.linearRampToValueAtTime(0.2, now + start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
    osc.connect(gain);
    gain.connect(ctx!.destination);
    osc.start(now + start);
    osc.stop(now + start + duration + 0.02);
  });
}

/**
 * Three sharp, loud beeps — deliberately louder and more insistent than
 * the message chime above, so a new booking request cuts through even if
 * the owner has the dashboard open in a background tab. Same
 * "safe to call from a background poll" reasoning as playMessageChime.
 */
export function playBookingAlert() {
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  [0, 0.25, 0.5].forEach((start) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = "sine";
    osc.frequency.value = 1046.5; // C6
    gain.gain.setValueAtTime(0, now + start);
    gain.gain.linearRampToValueAtTime(0.55, now + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + 0.2);
    osc.connect(gain);
    gain.connect(ctx!.destination);
    osc.start(now + start);
    osc.stop(now + start + 0.22);
  });
}
