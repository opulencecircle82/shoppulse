"use client";

import { useRef, useState } from "react";
import type { Shop, JobTicket } from "@/lib/supabase/types";
import { getCurrentPosition } from "@/lib/tech/gps";
import { uploadJobPhoto } from "@/lib/tech/uploadJobPhoto";
import { submitStartProof, submitCompletionProof } from "@/lib/tech/jobActions";

export default function TechJobScreen({
  shop,
  ticket,
  onBack,
  onSubmitted,
}: {
  shop: Shop;
  ticket: JobTicket;
  onBack: () => void;
  onSubmitted: () => void;
}) {
  const isStartStage = ticket.status === "SCHEDULED";
  const isCompletionStage = ticket.status === "IN_PROGRESS";
  const isActionable = isStartStage || isCompletionStage;

  const activeChecklist = isStartStage ? ticket.start_checklist : ticket.end_checklist;

  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checklistCompleted = checkedItems.size >= activeChecklist.length;
  const canSubmit =
    checklistCompleted && capturedFile !== null && position !== null && !submitting;

  function toggleItem(index: number) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function handleFileChosen(file: File) {
    setError(null);
    setCapturing(true);
    try {
      const pos = await getCurrentPosition();
      setCapturedFile(file);
      setCapturedPreview(URL.createObjectURL(file));
      setPosition(pos);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not capture proof.");
    } finally {
      setCapturing(false);
    }
  }

  async function handleSubmit() {
    if (!canSubmit || !capturedFile || !position) return;

    setSubmitting(true);
    setError(null);

    try {
      const photoUrl = await uploadJobPhoto(shop.id, ticket.id, capturedFile);
      const params = {
        ticketId: ticket.id,
        photoUrl,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      if (isStartStage) {
        await submitStartProof(params);
      } else {
        await submitCompletionProof(params);
      }

      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-brand-navy px-5 pb-10">
      <header className="flex items-center gap-3 py-4">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-slate-400 hover:text-white"
        >
          ← Back
        </button>
      </header>

      <h1 className="text-lg font-bold text-white">{ticket.client_name}</h1>
      <p className="mt-1 text-sm text-slate-400">{ticket.service_address}</p>

      {shop.mandatory_live_camera && (
        <span className="mt-4 inline-flex rounded-full bg-brand-emerald/15 px-3 py-1.5 text-[11px] font-semibold text-brand-emerald">
          Live Snapshot Enforced — Gallery Disabled
        </span>
      )}

      {!isActionable ? (
        <p className="mt-6 text-sm text-slate-400">
          This job is {ticket.status}. No action needed here.
        </p>
      ) : (
        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-orange">
            {isStartStage ? "Start Task Checklist" : "End Task Checklist"}
          </p>

          {activeChecklist.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No checklist items for this step.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {activeChecklist.map((item, index) => (
                <li key={index}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={checkedItems.has(index)}
                      onChange={() => toggleItem(index)}
                      className="h-4 w-4 accent-brand-orange"
                    />
                    <span className="text-sm text-white">{item}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 border-t border-white/10 pt-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileChosen(file);
                e.target.value = "";
              }}
            />

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={capturing}
                className="rounded-full bg-brand-blue px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {capturing
                  ? "Getting GPS..."
                  : capturedFile
                    ? "Retake Photo Proof"
                    : isStartStage
                      ? "Take Live Photo Proof + GPS Tag"
                      : "Take Completion Photo + GPS Tag"}
              </button>
            </div>

            {capturedPreview && (
              <div className="mt-4 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capturedPreview}
                  alt="Captured proof"
                  className="h-40 w-40 rounded-xl object-cover"
                />
              </div>
            )}

            {position && (
              <div className="mt-3 text-center">
                <p className="text-xs font-semibold text-brand-emerald">
                  GPS Tagged: {position.coords.latitude.toFixed(4)},{" "}
                  {position.coords.longitude.toFixed(4)} (±
                  {Math.round(position.coords.accuracy)}m)
                </p>
                {position.coords.accuracy > 100 && (
                  <p className="mt-1 text-xs text-amber-400">
                    Low GPS accuracy — this looks like a WiFi/network estimate,
                    not a real GPS fix. In your phone&apos;s Settings, set
                    Location mode to &quot;High accuracy&quot; (uses GPS, not
                    just WiFi), then retake the photo outdoors if possible.
                  </p>
                )}
              </div>
            )}

            {error && (
              <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="mt-6 w-full rounded-full bg-brand-orange px-6 py-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting
                ? "Submitting..."
                : isStartStage
                  ? "CLOCK IN & START JOB"
                  : "SUBMIT COMPLETION PROOF"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
