"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { MapPin, ShieldCheck, ShieldAlert } from "lucide-react";
import type { Shop, JobTicket } from "@/lib/supabase/types";
import { getCurrentPosition, haversineDistanceMeters } from "@/lib/tech/gps";
import { uploadJobPhoto, uploadSignature } from "@/lib/tech/uploadJobPhoto";
import { renderWatermarkedPhoto, sha256Hex } from "@/lib/tech/photoProof";
import {
  submitStartProof,
  submitCompletionProof,
  submitEstimate,
  fetchTicketLive,
} from "@/lib/tech/jobActions";
import { subscribeToJobTickets } from "@/lib/realtime/jobTicketChanges";
import SignaturePad from "@/components/shared/SignaturePad";
import TicketNumber from "@/components/ui/TicketNumber";
import SelectedProductsPicker, {
  type SelectedProduct,
} from "@/components/dashboard/SelectedProductsPicker";

// Safety-net poll for the live fields below; the real-time connection is what makes it instant.
const LIVE_POLL_MS = 8000;

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
  // Once the client approves the on-site quote (from a different
  // device), this flips locally so the screen moves straight into the
  // completion stage instead of forcing the technician to back out and
  // reopen the job to see the new status.
  const [effectiveStatus, setEffectiveStatus] = useState(ticket.status);
  const [quoteSubmittedAt, setQuoteSubmittedAt] = useState(ticket.quote_submitted_at);

  const isStartStage = effectiveStatus === "SCHEDULED";
  const isEstimateStage = effectiveStatus === "ESTIMATE_PENDING";
  const isCompletionStage = effectiveStatus === "IN_PROGRESS";
  const isActionable = isStartStage || isCompletionStage;

  const activeChecklist = isStartStage ? ticket.start_checklist : ticket.end_checklist;

  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [geofenceDistanceM, setGeofenceDistanceM] = useState<number | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [synced, setSynced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputId = useId();

  // PAID means proof of payment is in (or the shop confirmed it). It is what unlocks
  // the customer's signature on this screen — nobody has to approve anything by hand.
  const [paid, setPaid] = useState(ticket.payment_status === "PAID");
  const [paidAmount, setPaidAmount] = useState(
    ticket.payment_verified_amount > 0 ? ticket.payment_verified_amount : ticket.total_invoice_amount
  );
  const signatureRef = useRef<HTMLDivElement>(null);

  const [diagnosticFee, setDiagnosticFee] = useState(
    ticket.discount_percent
      ? Math.round(shop.default_service_fee * (1 - ticket.discount_percent / 100) * 100) / 100
      : shop.default_service_fee
  );
  const [laborFee, setLaborFee] = useState(0);
  const [quoteProducts, setQuoteProducts] = useState<SelectedProduct[]>(
    ticket.selected_products
  );
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Two things happen on other people's phones while the technician is in this
  // job: the customer approves the quote, and proof of payment arrives (or is
  // rejected). Both are re-read from the ticket the moment it changes — instantly
  // over the live connection, with a slow poll as a safety net — touching only
  // these fields so nothing half-typed is lost.
  const refreshLive = useCallback(async () => {
    const live = await fetchTicketLive(ticket.id).catch(() => null);
    if (!live) return;
    if (live.quoteApprovedAt) {
      setEffectiveStatus((current) => (current === "ESTIMATE_PENDING" ? "IN_PROGRESS" : current));
    }
    setPaid(live.paid);
    setPaidAmount(live.paidAmount);
  }, [ticket.id]);

  const listening =
    (isEstimateStage && quoteSubmittedAt !== null) || (isCompletionStage && !synced);
  useEffect(() => {
    if (!listening) return;
    const first = setTimeout(refreshLive, 0);
    const interval = setInterval(refreshLive, LIVE_POLL_MS);
    const stopRealtime = subscribeToJobTickets(
      `tech-job-${ticket.id}`,
      `id=eq.${ticket.id}`,
      refreshLive
    );
    return () => {
      clearTimeout(first);
      clearInterval(interval);
      stopRealtime();
    };
  }, [listening, refreshLive, ticket.id]);

  // When payment lands, bring the signature pad into view.
  useEffect(() => {
    if (paid && isCompletionStage) {
      signatureRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [paid, isCompletionStage]);

  async function handleSubmitEstimate() {
    setSubmittingQuote(true);
    setQuoteError(null);
    try {
      await submitEstimate({
        ticketId: ticket.id,
        diagnosticFee,
        laborFee,
        selectedProducts: quoteProducts,
      });
      setQuoteSubmittedAt(new Date().toISOString());
    } catch (e) {
      setQuoteError(e instanceof Error ? e.message : "Could not submit estimate.");
    } finally {
      setSubmittingQuote(false);
    }
  }

  const checklistCompleted = checkedItems.size >= activeChecklist.length;
  const needsPaymentVerification = isCompletionStage;
  const hasGeofenceTarget = ticket.booking_latitude !== null && ticket.booking_longitude !== null;

  // What the shop asks of a technician (Customize Mobile App).
  const photoRequired = shop.require_before_after_photos;
  const geofenceOn = shop.geofence_enforced && hasGeofenceTarget;
  // A GPS reading comes with every photo; with no photo required it is still
  // needed whenever the job site has to be checked.
  const needsPosition = photoRequired || geofenceOn;
  const needsSignature = isCompletionStage && shop.require_customer_signature;
  const showPrices = shop.show_job_prices_to_techs;
  const canAddToQuote = shop.allow_onsite_quote_additions;

  const withinGeofence =
    !geofenceOn || geofenceDistanceM === null || geofenceDistanceM <= shop.geofence_radius_meters;
  const canSubmit =
    checklistCompleted &&
    (!photoRequired || capturedFile !== null) &&
    (!needsPosition || position !== null) &&
    withinGeofence &&
    (!needsSignature || signatureDataUrl !== null) &&
    (!needsPaymentVerification || paid) &&
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

  // Remembers where the technician is standing and how far that is from the job site.
  function applyPosition(pos: GeolocationPosition) {
    setPosition(pos);
    setGeofenceDistanceM(
      hasGeofenceTarget
        ? haversineDistanceMeters(
            pos.coords.latitude,
            pos.coords.longitude,
            ticket.booking_latitude!,
            ticket.booking_longitude!
          )
        : null
    );
  }

  async function handleFileChosen(file: File) {
    setError(null);
    setCapturing(true);
    try {
      const pos = await getCurrentPosition();
      setCapturedFile(file);
      setCapturedPreview(URL.createObjectURL(file));
      applyPosition(pos);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not capture proof.");
    } finally {
      setCapturing(false);
    }
  }

  // For shops that don't require a photo but still check where the technician is.
  async function handleCheckLocation() {
    setError(null);
    setCapturing(true);
    try {
      applyPosition(await getCurrentPosition());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not get your location.");
    } finally {
      setCapturing(false);
    }
  }

  async function handleSubmit() {
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      let photoUrl: string | null = null;
      let photoHash: string | null = null;
      if (capturedFile && position) {
        const watermarked = await renderWatermarkedPhoto(capturedFile, {
          shopName: shop.shop_name,
          logoUrl: shop.logo_url,
          showLogo: shop.watermark_show_logo,
          showTimestamp: shop.watermark_show_timestamp,
          showGps: shop.watermark_show_gps,
          timestamp: new Date(),
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        photoHash = await sha256Hex(watermarked);
        photoUrl = await uploadJobPhoto(shop.id, ticket.id, watermarked);
      }
      const latitude = position?.coords.latitude ?? null;
      const longitude = position?.coords.longitude ?? null;

      if (isStartStage) {
        await submitStartProof({
          ticketId: ticket.id,
          photoUrl,
          photoHash,
          geofenceDistanceM,
          latitude,
          longitude,
        });
      } else {
        const signatureUrl = signatureDataUrl
          ? await uploadSignature(shop.id, ticket.id, signatureDataUrl)
          : null;
        await submitCompletionProof({
          ticketId: ticket.id,
          photoUrl,
          photoHash,
          geofenceDistanceM,
          latitude,
          longitude,
          signatureUrl,
        });
      }

      setSynced(true);
      // Starting a job heads straight back to the list. Finishing one waits for the
      // technician to tap "Proceed to Next Job" — a timer could fire after they have
      // already opened the next job and pull them out of it.
      if (isStartStage) setTimeout(onSubmitted, 900);
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

      <TicketNumber jobNumber={ticket.job_number} id={ticket.id} />
      <h1 className="mt-1 text-lg font-bold text-white">{ticket.client_name}</h1>
      <p className="mt-1 text-sm text-slate-400">{ticket.service_type}</p>
      <p className="mt-0.5 text-sm text-slate-500">{ticket.service_address}</p>

      {shop.mandatory_live_camera && (
        <span className="mt-4 inline-flex rounded-full bg-brand-emerald/15 px-3 py-1.5 text-[11px] font-semibold text-brand-emerald">
          Live Snapshot Enforced — Gallery Disabled
        </span>
      )}

      {isEstimateStage ? (
        <div className="mt-6">
          {quoteSubmittedAt ? (
            <div className="rounded-2xl bg-white/5 p-5 text-center">
              <p className="text-sm font-semibold text-white">Estimate sent to customer</p>
              <p className="mt-1.5 text-xs text-slate-400">
                Waiting for them to approve it before you can start the actual repair. This
                updates automatically.
              </p>
              {showPrices && (
              <div className="mt-4 space-y-1.5 rounded-xl bg-white/5 p-3 text-left text-sm">
                {diagnosticFee > 0 && (
                  <div className="flex justify-between text-slate-300">
                    <span>Diagnostic Fee</span>
                    <span>{shop.currency} {diagnosticFee.toFixed(2)}</span>
                  </div>
                )}
                {laborFee > 0 && (
                  <div className="flex justify-between text-slate-300">
                    <span>Labor (est.)</span>
                    <span>{shop.currency} {laborFee.toFixed(2)}</span>
                  </div>
                )}
                {quoteProducts.map((item, index) => (
                  <div key={index} className="flex justify-between text-slate-300">
                    <span>{item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ""}</span>
                    <span>{shop.currency} {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-white/10 pt-1.5 font-semibold text-white">
                  <span>Total</span>
                  <span>{shop.currency} {ticket.total_invoice_amount.toFixed(2)}</span>
                </div>
              </div>
              )}
            </div>
          ) : (

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-brand-orange">
                Create On-Site Estimate
              </p>
              <p className="mt-1.5 text-xs text-slate-400">
                Diagnose the issue, then send the customer a quote. They&apos;ll need to
                approve it before you can start the repair.
              </p>

              {ticket.discount_percent && (
                <p className="mt-3 inline-block rounded-full bg-brand-orange/10 px-2.5 py-1 text-[11px] font-semibold text-brand-orange">
                  {ticket.discount_percent}% promo discount already applied to the Diagnostic Fee below.
                </p>
              )}

              {showPrices && (
                <div className={`mt-4 grid gap-3 ${canAddToQuote ? "grid-cols-2" : "grid-cols-1"}`}>
                  <div>
                    <label className="block text-xs font-medium text-slate-400">
                      Diagnostic Fee ({shop.currency})
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={diagnosticFee}
                      onChange={(e) => setDiagnosticFee(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-brand-blue focus:outline-none"
                    />
                  </div>
                  {canAddToQuote && (
                    <div>
                      <label className="block text-xs font-medium text-slate-400">
                        Labor Fee ({shop.currency})
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={laborFee}
                        onChange={(e) => setLaborFee(Number(e.target.value))}
                        className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-brand-blue focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {canAddToQuote ? (
                <div className="mt-4">
                  <SelectedProductsPicker
                    theme="dark"
                    shopId={shop.id}
                    currency={shop.currency}
                    selectedProducts={quoteProducts}
                    onChange={setQuoteProducts}
                    label="Parts Needed"
                    showPrices={showPrices}
                  />
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-white/5 px-3.5 py-3 text-xs text-slate-400">
                  Your shop adds parts and extra charges for you — just send the standard estimate.
                </p>
              )}

              {showPrices && (
                <div className="mt-4 flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                  <span className="text-sm text-slate-400">Estimated Total</span>
                  <span className="text-lg font-bold text-brand-emerald">
                    {shop.currency}{" "}
                    {(
                      diagnosticFee +
                      laborFee +
                      quoteProducts.reduce((sum, item) => sum + item.price * item.quantity, 0)
                    ).toFixed(2)}
                  </span>
                </div>
              )}

              {quoteError && (
                <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
                  {quoteError}
                </p>
              )}

              <button
                type="button"
                onClick={handleSubmitEstimate}
                disabled={submittingQuote}
                className="mt-4 w-full rounded-full bg-gradient-to-r from-amber-400 to-brand-orange-dark px-6 py-3.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(249,115,22,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submittingQuote ? "Sending..." : "Send Estimate to Customer"}
              </button>
            </div>
          )}
        </div>
      ) : !isActionable ? (
        <div className="mt-6">
          <p className="text-sm text-slate-400">
            This job is {ticket.status}. No action needed here.
          </p>

          {showPrices && ticket.total_invoice_amount > 0 && (
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
                  {needsPosition ? "AWAITING CAPTURE" : "NOT REQUIRED"}
                </span>
              )}
            </div>
            {geofenceOn && geofenceDistanceM !== null ? (
              <p
                className={`mt-1.5 flex items-center gap-1 text-xs font-semibold ${
                  withinGeofence ? "text-brand-emerald" : "text-red-400"
                }`}
              >
                {withinGeofence ? (
                  <ShieldCheck className="h-3.5 w-3.5" />
                ) : (
                  <ShieldAlert className="h-3.5 w-3.5" />
                )}
                {withinGeofence
                  ? `Within geofence — ${Math.round(geofenceDistanceM)}m from the job site (limit ${shop.geofence_radius_meters}m)`
                  : `Too far from the job site — ${Math.round(geofenceDistanceM)}m away, must be within ${shop.geofence_radius_meters}m`}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-slate-500">
                {shop.geofence_enforced
                  ? `Geofence tolerance: ${shop.geofence_radius_meters}m around the job site.`
                  : "Location check is off — your shop doesn't limit where you start or finish."}
                {shop.geofence_enforced &&
                  !hasGeofenceTarget &&
                  " (No site coordinates on this ticket — not enforced.)"}
              </p>
            )}
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
              capture={shop.mandatory_live_camera ? "environment" : undefined}
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
                    : !photoRequired
                      ? "Add a Photo (optional)"
                      : isStartStage
                        ? "Take Live Photo Proof + GPS Tag"
                        : "Take Completion Photo + GPS Tag"}
              </label>
            </div>

            {!photoRequired && needsPosition && !position && (
              <div className="mt-3 text-center">
                <p className="text-xs text-slate-500">
                  Your shop doesn&apos;t require a photo, but it does check where you are.
                </p>
                <button
                  type="button"
                  onClick={handleCheckLocation}
                  disabled={capturing}
                  className="mt-2 rounded-full border border-brand-blue/40 px-5 py-2.5 text-xs font-semibold text-brand-blue disabled:opacity-60"
                >
                  {capturing ? "Getting GPS..." : "Check My Location"}
                </button>
              </div>
            )}

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
                    {shop.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={shop.logo_url} alt="" className="h-4 w-4 rounded object-cover" />
                    ) : (
                      <span className="flex h-4 w-4 items-center justify-center rounded bg-brand-blue text-[8px] font-bold text-white">
                        {shop.shop_name.slice(0, 1).toUpperCase() || "S"}
                      </span>
                    )}
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
                  {needsSignature ? "Customer Signature & Parts" : "Parts Used"}
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

                {paid ? (
                  <>
                    <p className="mt-3 rounded-lg bg-brand-emerald/15 px-3.5 py-2.5 text-xs font-semibold text-brand-emerald">
                      ✓ Payment received
                      {showPrices && ` — ${shop.currency} ${paidAmount.toFixed(2)}`}
                      {needsSignature && ". Hand the phone to the customer to sign."}
                    </p>
                    {needsSignature && (
                      <div className="mt-3" ref={signatureRef}>
                        <SignaturePad onChange={setSignatureDataUrl} />
                      </div>
                    )}
                  </>
                ) : (
                  <p className="mt-3 rounded-lg bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-400">
                    Waiting for the customer&apos;s payment
                    before you can{needsSignature ? " collect a signature and" : ""} complete this job.
                    This unlocks the moment proof of payment comes in.
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
              isStartStage ? (
                <div className="mt-6 flex items-center justify-center gap-2 rounded-full bg-brand-emerald/15 px-6 py-3.5 text-sm font-bold text-brand-emerald">
                  <ShieldCheck className="h-4 w-4" /> Proof Synced to Owner Dashboard
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-center gap-2 rounded-full bg-brand-emerald/15 px-6 py-3.5 text-sm font-bold text-brand-emerald">
                    <ShieldCheck className="h-4 w-4" /> Job Completed — Proof Synced
                  </div>
                  <button
                    type="button"
                    onClick={onSubmitted}
                    className="w-full rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
                  >
                    Proceed to Next Job
                  </button>
                </div>
              )
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
