"use client";

import { useEffect, useId, useState, type ChangeEvent } from "react";
import { ShieldCheck, ChevronDown, ChevronUp, History, Download, ScanSearch } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
  PHOTO_RETENTION_DAYS,
  checkPhotoCopy,
  fetchJobPhotos,
  savePhotoCopy,
  type CopyCheck,
} from "@/lib/dashboard/jobPhotos";
import { formatJobNumber } from "@/lib/jobNumber";
import type { JobPhoto, JobTicket, Shop, StaffMember } from "@/lib/supabase/types";

type JobTicketLog = {
  id: string;
  event_type: string;
  detail: string;
  actor_role: string | null;
  actor_name: string | null;
  created_at: string;
};

/** Every meaningful change to this ticket (status, assignment, quote,
 * invoice, payment), for dispute resolution — who changed what, and
 * when. Collapsed by default since it's reference material, not
 * something the owner needs on every open. */
function ActivityLog({ ticketId }: { ticketId: string }) {
  const [logs, setLogs] = useState<JobTicketLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    supabase
      .from("job_ticket_logs")
      .select("id, event_type, detail, actor_role, actor_name, created_at")
      .eq("job_ticket_id", ticketId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (active) {
          setLogs((data as JobTicketLog[]) ?? []);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [ticketId]);

  if (loading || logs.length === 0) return null;

  return (
    <div className="mt-5 rounded-xl bg-slate-50 p-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <History className="h-3.5 w-3.5" />
          Activity Log ({logs.length})
        </p>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-slate-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-500" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 max-h-56 space-y-2.5 overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="text-xs">
              <p className="text-slate-600">{log.detail}</p>
              <p className="mt-0.5 text-slate-500">
                {log.actor_name ?? "System"}
                {log.actor_role && log.actor_role !== "system" ? ` (${log.actor_role})` : ""} ·{" "}
                {new Date(log.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const COPY_CHECK_TEXT: Record<CopyCheck, { text: string; tone: string }> = {
  MATCH: { text: "This file is the original — its fingerprint matches.", tone: "text-brand-emerald-dark" },
  DIFFERENT: { text: "This is NOT the original — the fingerprint does not match.", tone: "text-red-600" },
  NO_FINGERPRINT: { text: "No fingerprint was recorded for this older photo, so it can't be checked.", tone: "text-slate-500" },
};

function ProofPhoto({
  label,
  url,
  hash,
  photo,
  saveName,
  distanceM,
  geofenceRadiusM,
  geofenceEnforced,
  photoOptional,
}: {
  label: string;
  url: string | null;
  hash: string | null;
  /** The photo's registry row: its address (code) and fingerprint, which stay after the file is removed. */
  photo: JobPhoto | null;
  saveName: string;
  distanceM: number | null;
  geofenceRadiusM: number;
  geofenceEnforced: boolean;
  photoOptional: boolean;
}) {
  const checkInputId = useId();
  const [saving, setSaving] = useState(false);
  const [checkResult, setCheckResult] = useState<CopyCheck | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const removed = !url && photo?.purged_at;
  const fingerprint = photo?.sha256 ?? hash;

  async function handleSave() {
    if (!url) return;
    setSaving(true);
    await savePhotoCopy(url, saveName);
    setSaving(false);
  }

  async function handleCheck(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !photo) return;
    setCheckError(null);
    try {
      setCheckResult(await checkPhotoCopy(file, photo));
    } catch {
      setCheckResult(null);
      setCheckError("Couldn't read that file. Try again.");
    }
  }

  // The GPS/timestamp/logo badges are burned into the photo's pixels
  // at capture time now (see renderWatermarkedPhoto), so this just
  // displays the file as-is instead of stacking a second CSS overlay
  // on top of one that's already there.
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="relative mt-1.5 aspect-video overflow-hidden rounded-xl bg-slate-50 shadow-sm shadow-slate-900/5">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-4 text-center">
            <span className="text-xs text-slate-500">
              {removed
                ? `Removed from the server on ${new Date(photo.purged_at!).toLocaleDateString()} to save space. Its address and fingerprint are kept below.`
                : photoOptional
                  ? "No photo attached — photos are optional for this shop"
                  : "No photo yet — appears once submitted via mobile app"}
            </span>
          </div>
        )}
      </div>
      {url && (
        <p className="mt-1 text-[10px] text-slate-500">
          {distanceM !== null
            ? !geofenceEnforced
              ? `${Math.round(distanceM)}m from site`
              : distanceM <= geofenceRadiusM
                ? `✓ ${Math.round(distanceM)}m from site`
                : `⚠ ${Math.round(distanceM)}m from site (outside ${geofenceRadiusM}m)`
            : "Site coordinates unavailable"}
        </p>
      )}
      {(photo || fingerprint) && (
        <p className="mt-0.5 text-[10px] text-slate-500">
          {photo && (
            <>
              Photo ID <span className="font-mono font-semibold text-slate-700">{photo.code}</span>
              {" · "}
            </>
          )}
          {fingerprint ? (
            <>
              fingerprint <span className="font-mono">#{fingerprint.slice(0, 10)}</span>
            </>
          ) : (
            "no fingerprint (older photo)"
          )}
        </p>
      )}
      {photo?.sha256_mismatch && (
        <p className="mt-1 text-[10px] font-semibold text-red-600">
          The stored file did not match its capture fingerprint when it was removed.
        </p>
      )}
      {(url || (photo && fingerprint)) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {url && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-brand-blue hover:text-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5" />
              {saving ? "Saving..." : "Save a copy"}
            </button>
          )}
          {photo && fingerprint && (
            <>
              <input id={checkInputId} type="file" accept="image/*" onChange={handleCheck} className="hidden" />
              {/* A real <label for=...> opens the picker straight from the tap — no JS click that some Android WebViews drop. */}
              <label
                htmlFor={checkInputId}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-brand-blue hover:text-brand-blue"
              >
                <ScanSearch className="h-3.5 w-3.5" />
                Check a copy
              </label>
            </>
          )}
        </div>
      )}
      {checkResult && (
        <p className={`mt-1.5 text-xs font-semibold ${COPY_CHECK_TEXT[checkResult].tone}`}>
          {COPY_CHECK_TEXT[checkResult].text}
        </p>
      )}
      {checkError && <p className="mt-1.5 text-xs text-red-600">{checkError}</p>}
    </div>
  );
}

export default function ProofDisputeDrawer({
  ticket,
  shop,
  staff,
  onClose,
  onChanged,
  onApproved,
}: {
  ticket: JobTicket;
  shop: Shop;
  staff: StaffMember[];
  onClose: () => void;
  onChanged: () => void;
  onApproved: (ticket: JobTicket) => void;
}) {
  const [notes, setNotes] = useState(ticket.dispute_notes ?? "");
  const [saving, setSaving] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<JobPhoto[]>([]);

  useEffect(() => {
    let active = true;
    fetchJobPhotos(ticket.id)
      .then((rows) => {
        if (active) setPhotos(rows);
      })
      .catch(() => {
        // The photos still show from the job itself; only their address and fingerprint go missing.
      });
    return () => {
      active = false;
    };
  }, [ticket.id]);

  const latestPhoto = (kind: JobPhoto["kind"]) => photos.filter((photo) => photo.kind === kind).at(-1) ?? null;
  const startPhoto = latestPhoto("START");
  const endPhoto = latestPhoto("END");
  const jobLabel = formatJobNumber(ticket.job_number, ticket.id).replace("#", "");

  const assignedStaff = staff.find((s) => s.id === ticket.assigned_staff_id);
  const timeSpent =
    ticket.started_at && ticket.completed_at
      ? (new Date(ticket.completed_at).getTime() - new Date(ticket.started_at).getTime()) / 60000
      : null;
  const productsCost = ticket.selected_products.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const hasBothProofs =
    (ticket.start_photo_url !== null && ticket.end_photo_url !== null) || ticket.completed_at !== null;
  // The proof pack can be opened for any job that has photos, but only a
  // finished (or disputed) one can be approved or rejected from here.
  const canDecide = ticket.status === "COMPLETED" || ticket.status === "DISPUTED";
  const geofenceBreached =
    shop.geofence_enforced &&
    ((ticket.start_geofence_distance_m !== null &&
      ticket.start_geofence_distance_m > shop.geofence_radius_meters) ||
    (ticket.end_geofence_distance_m !== null &&
      ticket.end_geofence_distance_m > shop.geofence_radius_meters));

  async function handleApprove() {
    setSaving("approve");
    setError(null);

    // Approving previously left total_invoice_amount at 0 until the owner
    // separately filled out and saved the invoice modal that pops up next —
    // easy to skip past without noticing, leaving staff/customer with no
    // receipt at all. Now Approve computes a real starting invoice right
    // away (actual hours from start/end timestamps × the shop's standard
    // rate, plus any selected products), so there's always something there
    // even if the owner just closes the modal instead of adjusting it.
    const actualHours =
      ticket.started_at && ticket.completed_at
        ? Math.max(
            0,
            (new Date(ticket.completed_at).getTime() -
              new Date(ticket.started_at).getTime()) /
              3600000
          )
        : ticket.estimated_hours || 0;
    const productsCost = ticket.selected_products.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    // If the client already approved an on-site quote, that's the figure
    // they agreed to pay for the diagnostic + labor — carry it forward as
    // the invoice's starting point instead of silently recomputing a
    // different number from hours × the shop's standard rate. Products
    // still get refreshed since parts used can change during the repair.
    const laborCost = ticket.quote_approved_at
      ? ticket.total_labor_cost
      : Math.round(actualHours * shop.default_hourly_rate * 100) / 100;
    const serviceFee = ticket.quote_approved_at ? ticket.service_fee : shop.default_service_fee;
    const totalInvoiceAmount = laborCost + productsCost + serviceFee;
    const warrantyExpiresAt =
      shop.warranty_days > 0
        ? new Date(Date.now() + shop.warranty_days * 86400000).toISOString()
        : null;

    const { error: updateError } = await supabase
      .from("job_tickets")
      .update({
        status: "APPROVED",
        dispute_notes: notes || null,
        actual_hours: actualHours,
        total_labor_cost: laborCost,
        service_fee: serviceFee,
        total_invoice_amount: totalInvoiceAmount,
        warranty_expires_at: warrantyExpiresAt,
      })
      .eq("id", ticket.id);

    if (updateError) {
      setSaving(null);
      setError(updateError.message);
      return;
    }

    // Approval is the one point where selected_products is final — deduct
    // the parts actually used from inventory here, once, with a movement
    // record so it shows up in that item's stock History.
    if (ticket.selected_products.length > 0) {
      const productIds = ticket.selected_products.map((item) => item.product_id);
      const { data: currentProducts } = await supabase
        .from("shop_products")
        .select("id, quantity")
        .in("id", productIds);
      const quantityById = new Map(
        (currentProducts ?? []).map((p) => [p.id as string, p.quantity as number])
      );

      for (const item of ticket.selected_products) {
        const current = quantityById.get(item.product_id) ?? 0;
        await supabase
          .from("shop_products")
          .update({ quantity: Math.max(0, current - item.quantity) })
          .eq("id", item.product_id);
        await supabase.from("shop_product_stock_movements").insert({
          shop_id: shop.id,
          product_id: item.product_id,
          change_qty: -item.quantity,
          note: `Used on job for ${ticket.client_name}`,
        });
      }
    }

    setSaving(null);
    onChanged();
    onApproved({
      ...ticket,
      status: "APPROVED",
      actual_hours: actualHours,
      total_labor_cost: laborCost,
      service_fee: serviceFee,
      total_invoice_amount: totalInvoiceAmount,
      warranty_expires_at: warrantyExpiresAt,
    });
    onClose();
  }

  async function handleReject() {
    setSaving("reject");
    setError(null);
    const { error: updateError } = await supabase
      .from("job_tickets")
      .update({ status: "DISPUTED", dispute_notes: notes })
      .eq("id", ticket.id);
    setSaving(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onChanged();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/10"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Proof &amp; Dispute Review
            </h3>
            <p className="text-xs text-slate-500">
              {ticket.client_name} &middot; {ticket.service_type}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-brand-emerald/30 bg-brand-emerald/10 px-3 py-1.5 text-xs font-semibold text-brand-emerald-dark">
          <ShieldCheck className="h-3.5 w-3.5" />
          Live Snapshot Enforced &mdash; Gallery Disabled
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Each photo has its own address (Photo ID) and fingerprint on record. The photo file stays on our server for{" "}
          {PHOTO_RETENTION_DAYS} days after a job is finished (once its warranty is over) — tap{" "}
          <span className="font-semibold text-slate-700">Save a copy</span> to keep it. A saved copy can always be
          verified with <span className="font-semibold text-slate-700">Check a copy</span>.
        </p>

        <div className="mt-5 space-y-4">
          <ProofPhoto
            label="Job Start Proof"
            url={ticket.start_photo_url}
            hash={ticket.start_photo_hash}
            photo={startPhoto}
            saveName={`${jobLabel}-start-${startPhoto?.code ?? "photo"}.jpg`}
            distanceM={ticket.start_geofence_distance_m}
            geofenceRadiusM={shop.geofence_radius_meters}
            geofenceEnforced={shop.geofence_enforced}
            photoOptional={!shop.require_before_after_photos}
          />
          <ProofPhoto
            label="Job Completion Proof"
            url={ticket.end_photo_url}
            hash={ticket.end_photo_hash}
            photo={endPhoto}
            saveName={`${jobLabel}-completion-${endPhoto?.code ?? "photo"}.jpg`}
            distanceM={ticket.end_geofence_distance_m}
            geofenceRadiusM={shop.geofence_radius_meters}
            geofenceEnforced={shop.geofence_enforced}
            photoOptional={!shop.require_before_after_photos}
          />
        </div>

        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Job Metrics &amp; Cost
          </p>
          <dl className="mt-2 space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Tech</dt>
              <dd className="font-medium text-slate-900">
                {assignedStaff?.full_name ?? "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Time</dt>
              <dd className="font-medium text-slate-900">
                {timeSpent !== null
                  ? `${Math.floor(timeSpent / 60)}h ${Math.round(timeSpent % 60)}m`
                  : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Geofence</dt>
              <dd
                className={`font-medium ${
                  !shop.geofence_enforced || !hasBothProofs
                    ? "text-slate-500"
                    : geofenceBreached
                      ? "text-red-600"
                      : "text-brand-emerald-dark"
                }`}
              >
                {!shop.geofence_enforced
                  ? "Not enforced"
                  : !hasBothProofs
                  ? "Awaiting proof"
                  : geofenceBreached
                    ? `Outside ${shop.geofence_radius_meters}m tolerance`
                    : `Within ${shop.geofence_radius_meters}m tolerance`}
              </dd>
            </div>
            {ticket.selected_products.length > 0 && (
              <div className="flex items-start justify-between">
                <dt className="shrink-0 text-slate-500">Parts</dt>
                <dd className="text-right font-medium text-slate-900">
                  {ticket.selected_products.map((item, i) => (
                    <span key={i} className="block">
                      {item.quantity}x {item.name} ({shop.currency} {item.price.toFixed(2)})
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {shop.default_service_fee > 0 && (
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Service Fee</dt>
                <dd className="font-medium text-slate-900">
                  {shop.currency} {shop.default_service_fee.toFixed(2)}
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-slate-300 pt-1.5">
              <dt className="text-slate-500">Labor + Parts + Fee Total</dt>
              <dd className="font-semibold text-brand-emerald-dark">
                {shop.currency}{" "}
                {(
                  (timeSpent !== null ? (timeSpent / 60) * shop.default_hourly_rate : 0) +
                  productsCost +
                  shop.default_service_fee
                ).toFixed(2)}
              </dd>
            </div>
          </dl>
        </div>

        {ticket.signature_url && (
          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Customer Signature
            </p>
            <div className="mt-1.5 rounded-xl bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ticket.signature_url}
                alt="Customer signature"
                className="h-20 w-full object-contain"
              />
            </div>
          </div>
        )}

        <ActivityLog ticketId={ticket.id} />

        {canDecide ? (
          <>
          <div className="mt-5">
            <label className="block text-xs font-medium text-slate-500">
              Dispute Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What did the client say was wrong with this job?"
              className="mt-1.5 w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
            />
          </div>

          {error && (
            <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleApprove}
              disabled={saving !== null}
              className="w-full rounded-full bg-brand-emerald px-6 py-3 text-sm font-semibold text-brand-slate shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-shadow hover:shadow-[0_0_30px_rgba(16,185,129,0.75)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving === "approve" ? "Approving..." : "Approve & Invoice"}
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={saving !== null || !notes.trim()}
              className="w-full rounded-full border border-red-500/40 px-6 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving === "reject" ? "Rejecting..." : "Reject Dispute"}
            </button>
            {!notes.trim() && (
              <p className="text-center text-xs text-slate-500">
                Add dispute notes above to reject this job.
              </p>
            )}
          </div>
          </>
        ) : (
          <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">
            View only — this job can be approved once the technician submits the completion proof.
          </p>
        )}
      </div>
    </div>
  );
}
