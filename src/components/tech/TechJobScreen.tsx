"use client";

import { useEffect, useId, useState } from "react";
import { MapPin, ShieldCheck } from "lucide-react";
import type { Shop, JobTicket } from "@/lib/supabase/types";
import { getCurrentPosition } from "@/lib/tech/gps";
import { uploadJobPhoto, uploadSignature } from "@/lib/tech/uploadJobPhoto";
import {
  submitStartProof,
  submitCompletionProof,
  fetchPaymentVerification,
} from "@/lib/tech/jobActions";
import SignaturePad from "@/components/shared/SignaturePad";

const PAYMENT_POLL_MS = 8000;

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
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [synced, setSynced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputId = useId();

  const [paymentVerifiedAt, setPaymentVerifiedAt] = useState(ticket.payment_verified_at);
  const [paymentVerifiedAmount, setPaymentVerifiedAmount] = useState(
    ticket.payment_verified_amount
  );

  // The tech app deliberately doesn't poll the ticket mid-job (would risk
  // disturbing an in-progress checklist/photo) — but once completion is
  // gated on the owner confirming payment from a separate device, the
  // technician needs SOME way to find out it happened without backing out
  // and re-opening the job. This polls only the two payment fields, so it
  // can't touch anything else in local state.
  useEffect(() => {
    if (!isCompletionStage || paymentVerifiedAt) return;
    let active = true;
    const interval = setInterval(async () => {
      const result = await fetchPaymentVerification(ticket.id).catch(() => null);
      if (active && result?.verifiedAt) {
        setPaymentVerifiedAt(result.verifiedAt);
        setPaymentVerifiedAmount(result.verifiedAmount);
      }
    }, PAYMENT_POLL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isCompletionStage, paymentVerifiedAt, ticket.id]);

  const checklistCompleted = checkedItems.size >= activeChecklist.length;
  const needsSignature = isCompletionStage;
  const needsPaymentVerification = isCompletionStage;
  const canSubmit =
    checklistCompleted &&
    capturedFile !== null &&
    position !== null &&
    (!needsSignature || signatureDataUrl !== null) &&
    (!needsPaymentVerification || paymentVerifiedAt !== null) &&
    !submitting;

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    ticket.service_address
  )}`;

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

      if (isStartStage) {
        await submitStartProof({
          ticketId: ticket.id,
          photoUrl,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      } else {
        const signatureUrl = signatureDataUrl
          ? await uploadSignature(shop.id, ticket.id, signatureDataUrl)
          : null;
        await submitCompletionProof({
          ticketId: ticket.id,
          photoUrl,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          signatureUrl,
        });
      }

      setSynced(true);
      setTimeout(onSubmitted, 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed.");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-brand-navy px-5 pb-10">
      <header className="flex items-center justify-between gap-3 py-4">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-slate-400 hover:text-white"
        >
          ← Back
        </button>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-full border border-brand-blue/40 px-3.5 py-1.5 text-xs font-semibold text-brand-blue"
        >
          <MapPin className="h-3.5 w-3.5" /> Go to Maps
        </a>
      </header>

      <h1 className="text-lg font-bold text-white">{ticket.client_name}</h1>
      <p className="mt-1 text-sm text-slate-400">{ticket.service_type}</p>
      <p className="mt-0.5 text-sm text-slate-500">{ticket.service_address}</p>

      {shop.mandatory_live_camera && (
        <span className="mt-4 inline-flex rounded-full bg-brand-emerald/15 px-3 py-1.5 text-[11px] font-semibold text-brand-emerald">
          Live Snapshot Enforced — Gallery Disabled
        </span>
      )}

      {!isActionable ? (
        <div className="mt-6">
          <p className="text-sm text-slate-400">
            This job is {ticket.status}. No action needed here.
          </p>

          {ticket.total_invoice_amount > 0 && (
            <div className="mt-4 rounded-2xl bg-white/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-brand-orange">
                Receipt — Show to Customer
              </p>
              {ticket.selected_products.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {ticket.selected_products.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm text-slate-300">
                      <span>
                        {item.name}
                        {item.quantity > 1 ? ` ×${item.quantity}` : ""}
                      </span>
                      <span>
                        {shop.currency} {(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {ticket.service_fee > 0 && (
                <div className="mt-1.5 flex justify-between text-sm text-slate-300">
                  <span>Service Fee</span>
                  <span>
                    {shop.currency} {ticket.service_fee.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                <span className="text-sm font-medium text-white">Total</span>
                <span className="text-lg font-bold text-brand-emerald">
                  {shop.currency} {ticket.total_invoice_amount.toFixed(2)}
                </span>
              </div>
              {ticket.payment_method ? (
                <p className="mt-2 text-xs text-slate-400">
                  Customer selected: {ticket.payment_method}
                </p>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  Customer hasn&apos;t chosen a payment method yet.
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6">
          <div className="rounded-2xl bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Site Status
              </p>
              {position ? (
                <span className="flex items-center gap-1 rounded-full bg-brand-emerald/15 px-2.5 py-1 text-[10px] font-bold text-brand-emerald">
                  <ShieldCheck className="h-3 w-3" /> GPS VERIFIED
                </span>
              ) : (
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-slate-400">
                  AWAITING CAPTURE
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Geofence tolerance: {shop.geofence_radius_meters}m around the proof photo location.
            </p>
          </div>

          <p className="mt-5 text-xs font-bold uppercase tracking-wide text-brand-orange">
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
            {/* A JS-triggered `fileInputRef.click()` can lose the browser's
                "user activation" by the time it runs inside some Android
                WebViews, silently failing to open the camera with no
                visible error. A real <label for=...> triggers the input's
                native default action directly from the tap, with no JS in
                between, so it can't lose activation. */}
            <input
              id={fileInputId}
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
              <label
                htmlFor={fileInputId}
                className={`rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] ${
                  capturing ? "pointer-events-none opacity-60" : "cursor-pointer"
                }`}
              >
                {capturing
                  ? "Getting GPS..."
                  : capturedFile
                    ? "Retake Photo Proof"
                    : isStartStage
                      ? "Take Live Photo Proof + GPS Tag"
                      : "Take Completion Photo + GPS Tag"}
              </label>
            </div>

            {capturedPreview && (
              <div className="mt-4 flex justify-center">
                <div className="relative h-48 w-full max-w-xs overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={capturedPreview}
                    alt="Captured proof"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-md bg-black/55 px-2 py-1 backdrop-blur">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-brand-blue text-[8px] font-bold text-white">
                      {shop.shop_name.slice(0, 1).toUpperCase() || "S"}
                    </span>
                    <span className="text-[10px] font-semibold text-white">
                      {shop.shop_name}
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-2 rounded-md bg-black/55 px-2 py-1 text-[9px] font-medium text-white backdrop-blur">
                    {new Date().toLocaleString()}
                  </div>
                  {position && (
                    <div className="absolute bottom-2 right-2 rounded-md bg-black/55 px-2 py-1 text-[9px] font-medium text-white backdrop-blur">
                      {position.coords.latitude.toFixed(4)}°, {position.coords.longitude.toFixed(4)}°
                    </div>
                  )}
                </div>
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

            {isCompletionStage && (
              <div className="mt-6 border-t border-white/10 pt-6">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-orange">
                  Customer Signature &amp; Parts
                </p>

                {ticket.selected_products.length > 0 && (
                  <div className="mt-3 space-y-1.5 rounded-xl bg-white/5 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Parts Used
                    </p>
                    {ticket.selected_products.map((item, index) => (
                      <div key={index} className="flex justify-between text-xs text-slate-300">
                        <span>{item.name}</span>
                        <span>×{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                )}

                {paymentVerifiedAt ? (
                  <>
                    <p className="mt-3 text-xs font-semibold text-brand-emerald">
                      Payment Verified by Owner: {shop.currency} {paymentVerifiedAmount.toFixed(2)}
                    </p>
                    <div className="mt-3">
                      <SignaturePad onChange={setSignatureDataUrl} />
                    </div>
                  </>
                ) : (
                  <p className="mt-3 rounded-lg bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-400">
                    Waiting for the owner to confirm the customer&apos;s payment
                    before you can collect a signature and complete this job.
                    This will update automatically.
                  </p>
                )}
              </div>
            )}

            {error && (
              <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
                {error}
              </p>
            )}

            {synced ? (
              <div className="mt-6 flex items-center justify-center gap-2 rounded-full bg-brand-emerald/15 px-6 py-3.5 text-sm font-bold text-brand-emerald">
                <ShieldCheck className="h-4 w-4" /> Proof Synced to Owner Dashboard
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="mt-6 w-full rounded-full bg-gradient-to-r from-amber-400 to-brand-orange-dark px-6 py-3.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(249,115,22,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting
                  ? "Submitting..."
                  : isStartStage
                    ? "CLOCK IN & START JOB"
                    : "COMPLETE JOB & SYNC PROOF"}
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
