"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Play, Square } from "lucide-react";
import {
  loadBookingAlertPrefs,
  saveBookingAlertPrefs,
  type BookingAlertPrefs,
} from "@/lib/dashboard/bookingAlertPrefs";
import { RINGTONES, startRinging, type RingtoneId } from "@/lib/dashboard/ringtones";
import BookingAlertCard from "../BookingAlertCard";

type Kind = "normal" | "urgent";

const noop = () => {};

const SAMPLE_REQUESTED_AT = new Date().toISOString();

function TonePicker({
  kind,
  selected,
  playing,
  onSelect,
  onTogglePlay,
}: {
  kind: Kind;
  selected: RingtoneId;
  playing: RingtoneId | null;
  onSelect: (id: RingtoneId) => void;
  onTogglePlay: (id: RingtoneId) => void;
}) {
  return (
    <div role="radiogroup" aria-label={`${kind === "urgent" ? "Urgent" : "Normal"} booking ringtone`} className="space-y-2">
      {RINGTONES.map((tone) => {
        const isSelected = tone.id === selected;
        const isPlaying = tone.id === playing;
        return (
          <div
            key={tone.id}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
              isSelected ? "border-brand-blue bg-brand-blue/5" : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <button
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(tone.id)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  isSelected ? "border-brand-blue bg-brand-blue text-white" : "border-slate-300"
                }`}
              >
                {isSelected && <Check className="h-3 w-3" />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">{tone.label}</span>
                <span className="block text-xs text-slate-500">{tone.description}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => onTogglePlay(tone.id)}
              aria-label={`${isPlaying ? "Stop" : "Play"} ${tone.label}`}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                isPlaying
                  ? "bg-brand-blue text-white"
                  : "border border-slate-300 text-slate-600 hover:border-brand-blue hover:text-brand-blue"
              }`}
            >
              {isPlaying ? <Square className="h-3 w-3 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default function BookingAlertsPanel() {
  const [prefs, setPrefs] = useState<BookingAlertPrefs>(loadBookingAlertPrefs);
  const [playing, setPlaying] = useState<{ kind: Kind; id: RingtoneId } | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      stopRef.current?.();
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  function update(patch: Partial<BookingAlertPrefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    saveBookingAlertPrefs(next);
  }

  function stopPreview() {
    stopRef.current?.();
    stopRef.current = null;
    if (timerRef.current) clearTimeout(timerRef.current);
    setPlaying(null);
  }

  function togglePlay(kind: Kind, id: RingtoneId) {
    if (playing?.kind === kind && playing.id === id) {
      stopPreview();
      return;
    }
    stopPreview();
    const tone = RINGTONES.find((t) => t.id === id);
    stopRef.current = startRinging(id, { volume: prefs.volume, cycles: 2 });
    setPlaying({ kind, id });
    // Two rings, then let the button pop back to "play".
    timerRef.current = setTimeout(() => setPlaying(null), (tone?.cycleMs ?? 2000) * 2 + 200);
  }

  function selectTone(kind: Kind, id: RingtoneId) {
    update(kind === "urgent" ? { urgentTone: id } : { normalTone: id });
    // Choosing a tone plays it once so the owner hears what they picked.
    stopPreview();
    stopRef.current = startRinging(id, { volume: prefs.volume, cycles: 1 });
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Booking Alerts</h2>
        <p className="mt-1 text-sm text-slate-500">
          When a customer books, a popup appears on your dashboard and rings. Pick how ordinary and
          urgent bookings sound so you can tell them apart without looking.
        </p>
      </div>

      <div className="grid gap-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 sm:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">Ring sound</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Turn off to see the popup without any sound.
          </p>
          <button
            type="button"
            role="switch"
            aria-checked={prefs.soundOn}
            onClick={() => update({ soundOn: !prefs.soundOn })}
            className={`relative mt-3 h-7 w-12 rounded-full transition-colors ${
              prefs.soundOn ? "bg-brand-blue" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                prefs.soundOn ? "left-6" : "left-1"
              }`}
            />
            <span className="sr-only">{prefs.soundOn ? "Ring sound is on" : "Ring sound is off"}</span>
          </button>
        </div>
        <div>
          <label htmlFor="booking-alert-volume" className="flex items-center justify-between text-sm font-semibold text-slate-900">
            Volume
            <span className="text-xs font-medium text-slate-500">{Math.round(prefs.volume * 100)}%</span>
          </label>
          <input
            id="booking-alert-volume"
            type="range"
            min={20}
            max={100}
            step={5}
            value={Math.round(prefs.volume * 100)}
            onChange={(e) => update({ volume: Number(e.target.value) / 100 })}
            disabled={!prefs.soundOn}
            className="mt-3 w-full accent-brand-blue disabled:opacity-50"
          />
          <p className="mt-1 text-xs text-slate-500">
            Also turn up your device volume — 100% here is the loudest the browser allows.
          </p>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        {(["normal", "urgent"] as const).map((kind) => (
          <section key={kind} className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {kind === "urgent" ? "Urgent booking" : "Normal booking"}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {kind === "urgent"
                  ? "Emergency requests. Rings non-stop until you respond or silence it."
                  : "Ordinary requests. Rings three times, then the popup waits quietly."}
              </p>
            </div>

            <div className="pointer-events-none select-none" aria-hidden="true">
              <BookingAlertCard
                urgent={kind === "urgent"}
                clientName="Sample Customer"
                service={kind === "urgent" ? "Burst pipe — water everywhere" : "Kitchen faucet repair"}
                address="123 Main Street, Your City"
                preferredDate={null}
                requestedAt={SAMPLE_REQUESTED_AT}
                ringing
                onSilence={noop}
                onView={noop}
                onDismiss={noop}
              />
            </div>

            <TonePicker
              kind={kind}
              selected={kind === "urgent" ? prefs.urgentTone : prefs.normalTone}
              playing={playing?.kind === kind ? playing.id : null}
              onSelect={(id) => selectTone(kind, id)}
              onTogglePlay={(id) => togglePlay(kind, id)}
            />
          </section>
        ))}
      </div>

      <p className="text-xs text-slate-500">
        Saved automatically on this device only — your phone and your office computer can each use
        their own ringtone. Browsers only allow sound after you have clicked on the page once.
      </p>
    </div>
  );
}
