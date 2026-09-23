"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Download, Star } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
  fetchTicketStaffLocation,
  fetchTicketReview,
  submitShopReview,
  uploadPaymentReceipt,
  cancelBooking,
} from "@/lib/customer/bookings";
import PhotoUploadField from "@/components/shared/PhotoUploadField";
import { downloadInvoicePng } from "@/lib/invoice/renderInvoicePng";
import { useSmartBack } from "@/lib/hooks/useSmartBack";

const ShopLocationMap = dynamic(
  () => import("@/components/customer/ShopLocationMap"),
  { ssr: false, loading: () => <div className="h-[180px] rounded-xl bg-white/5" /> }
);

const LIVE_POLL_MS = 15000;

type ClientTicket = {
  id: string;
  client_name: string;
  service_type: string;
  service_address: string;
  description: string | null;
  request_photo_url: string | null;
  status: string;
  start_photo_url: string | null;
  end_photo_url: string | null;
  started_at: string | null;
  completed_at: string | null;
  dispute_notes: string | null;
  shop_name: string;
  logo_url: string | null;
  shop_address: string | null;
  shop_contact_phone: string | null;
  watermark_show_logo: boolean;
  watermark_show_timestamp: boolean;
  watermark_show_gps: boolean;
  start_lat: number | null;
  start_lng: number | null;
  end_lat: number | null;
  end_lng: number | null;
  total_invoice_amount: number | null;
  tax_amount: number;
  service_fee: number;
  currency: string;
  selected_products: { product_id: string; name: string; price: number; quantity: number }[];
  payment_method: string | null;
  accepted_payment_methods: string[];
  signature_url: string | null;
  payment_receipt_url: string | null;
  invoice_paid_at: string | null;
  quote_submitted_at: string | null;
  quote_approved_at: string | null;
  total_labor_cost: number;
  warranty_expires_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  cancellation_fee_applied: boolean;
};

function ProofPhoto({
  label,
  url,
  timestamp,
  hasGps,
  ticket,
}: {
  label: string;
  url: string | null;
  timestamp: string | null;
  hasGps: boolean;
  ticket: ClientTicket;
}) {
  if (!url) return null;

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <div className="relative mt-1.5 aspect-video overflow-hidden rounded-xl bg-white/5 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={label} className="h-full w-full object-cover" />

        {ticket.watermark_show_logo && (
          <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-md bg-black/50 px-2 py-1 backdrop-blur">
            <span className="text-[10px] font-semibold text-white">{ticket.shop_name}</span>
          </div>
        )}
        {ticket.watermark_show_timestamp && (
          <div className="absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-1 text-[10px] font-medium text-white backdrop-blur">
            {timestamp ? new Date(timestamp).toLocaleString() : "—"}
          </div>
        )}
        {ticket.watermark_show_gps && hasGps && (
          <div className="absolute bottom-2 right-2 rounded-md bg-black/50 px-2 py-1 text-[10px] font-medium text-white backdrop-blur">
            GPS Verified
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClientTicketPage() {
  const params = useParams();
  const goBack = useSmartBack("/customer");
  const ticketId = params.ticketId as string;

  const [ticket, setTicket] = useState<ClientTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staffLocation, setStaffLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [review, setReview] = useState<{
    rating: number;
    comment: string | null;
    photo_url: string | null;
  } | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewPhotoUrl, setReviewPhotoUrl] = useState<string | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [selectingPayment, setSelectingPayment] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [approvingQuote, setApprovingQuote] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [claimingWarranty, setClaimingWarranty] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimedTicketId, setClaimedTicketId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .rpc("get_client_ticket", { p_ticket_id: ticketId })
      .maybeSingle();

    if (fetchError || !data) {
      setError("We couldn't find this job. The link may be incorrect.");
      setLoading(false);
      return;
    }

    setTicket(data as ClientTicket);
    setLoading(false);
    supabase.rpc("client_mark_viewed", { p_ticket_id: ticketId });
  }, [ticketId]);

  useEffect(() => {
    const id = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(id);
  }, [load]);

  useEffect(() => {
    if (
      !ticket ||
      !["SCHEDULED", "ESTIMATE_PENDING", "IN_PROGRESS"].includes(ticket.status)
    )
      return;

    let active = true;
    async function poll() {
      const loc = await fetchTicketStaffLocation(ticketId).catch(() => null);
      if (active) setStaffLocation(loc ? { lat: loc.lat, lng: loc.lng } : null);
    }
    poll();
    const interval = setInterval(poll, LIVE_POLL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [ticket, ticketId]);

  useEffect(() => {
    if (!ticket || !["COMPLETED", "APPROVED", "DISPUTED"].includes(ticket.status)) return;
    let active = true;
    fetchTicketReview(ticketId).then((existing) => {
      if (active) setReview(existing);
    });
    return () => {
      active = false;
    };
  }, [ticket, ticketId]);

  async function handleSubmitReview() {
    if (reviewRating === 0) return;
    setReviewSubmitting(true);
    try {
      await submitShopReview({
        ticketId,
        rating: reviewRating,
        comment: reviewComment,
        photoUrl: reviewPhotoUrl,
      });
      setReview({ rating: reviewRating, comment: reviewComment || null, photo_url: reviewPhotoUrl });
    } finally {
      setReviewSubmitting(false);
    }
  }

  async function handleApproveQuote() {
    setApprovingQuote(true);
    setApproveError(null);
    const { error: rpcError } = await supabase.rpc("client_approve_quote", {
      p_ticket_id: ticketId,
    });
    setApprovingQuote(false);
    if (rpcError) {
      setApproveError(rpcError.message);
      return;
    }
    await load();
  }

  async function handleClaimWarranty() {
    setClaimingWarranty(true);
    setClaimError(null);
    const { data, error: rpcError } = await supabase.rpc("client_claim_warranty", {
      p_ticket_id: ticketId,
    });
    setClaimingWarranty(false);
    if (rpcError) {
      setClaimError(rpcError.message);
      return;
    }
    setClaimedTicketId(data as string);
  }

  async function handleCancelBooking() {
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelBooking(ticketId);
      setShowCancelConfirm(false);
      await load();
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : "Could not cancel this booking.");
    } finally {
      setCancelling(false);
    }
  }

  async function handleSelectPayment(method: string) {
    setSelectingPayment(true);
    await supabase.rpc("client_select_payment_method", {
      p_ticket_id: ticketId,
      p_method: method,
    });
    setSelectingPayment(false);
    await load();
  }

  async function handleUploadReceipt(url: string | null) {
    if (!url) return;
    setUploadingReceipt(true);
    try {
      await uploadPaymentReceipt(ticketId, url);
      await load();
    } finally {
      setUploadingReceipt(false);
    }
  }

  async function handleDownloadInvoice() {
    if (!ticket || ticket.total_invoice_amount === null) return;
    setDownloadingInvoice(true);
    try {
      const items = [
        ...ticket.selected_products.map((item) => ({
          label: `${item.name}${item.quantity > 1 ? ` ×${item.quantity}` : ""}`,
          amount: item.price * item.quantity,
        })),
        ...(ticket.service_fee > 0 ? [{ label: "Service Fee", amount: ticket.service_fee }] : []),
      ];
      await downloadInvoicePng(
        {
          shopName: ticket.shop_name,
          shopLogoUrl: ticket.logo_url,
          shopAddress: ticket.shop_address,
          shopContactPhone: ticket.shop_contact_phone,
          clientName: ticket.client_name,
          serviceType: ticket.service_type,
          date: new Date().toLocaleDateString(),
          currency: ticket.currency,
          items,
          taxAmount: ticket.tax_amount,
          totalAmount: ticket.total_invoice_amount,
          paymentMethod: ticket.payment_method,
        },
        `invoice-${ticket.shop_name.replace(/\s+/g, "-").toLowerCase()}.png`
      );
    } finally {
      setDownloadingInvoice(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-navy">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
      </main>
    );
  }

  if (error || !ticket) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-navy px-6 text-center">
        <p className="text-sm text-slate-400">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-navy px-6 py-10">
      <div className="mx-auto max-w-lg">
        <button
          type="button"
          onClick={goBack}
          className="text-sm font-medium text-slate-400 hover:text-white"
        >
          ← Back
        </button>

        <div className="mt-3 flex items-center gap-3">
          {ticket.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ticket.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
          )}
          <div>
            <p className="text-lg font-bold text-white">{ticket.shop_name}</p>
            <p className="text-xs text-slate-400">Job verification</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white/5 p-6 shadow-md shadow-black/20">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              ticket.status === "APPROVED"
                ? "bg-brand-emerald/15 text-brand-emerald"
                : ticket.status === "DISPUTED" || ticket.status === "CANCELLED"
                  ? "bg-red-500/15 text-red-400"
                  : "bg-brand-blue/15 text-brand-blue"
            }`}
          >
            {ticket.status === "PENDING" ? "Request Sent" : ticket.status.replace("_", " ")}
          </span>

          <h1 className="mt-3 text-xl font-bold text-white">{ticket.service_type}</h1>
          <p className="mt-1 text-sm text-slate-400">{ticket.service_address}</p>
          <p className="mt-1 text-sm text-slate-400">For: {ticket.client_name}</p>

          {["PENDING", "UNASSIGNED", "SCHEDULED", "ESTIMATE_PENDING"].includes(ticket.status) && (
            <div className="mt-4">
              {showCancelConfirm ? (
                <div className="rounded-xl bg-red-500/10 p-3.5">
                  <p className="text-xs text-red-300">
                    {ticket.status === "ESTIMATE_PENDING"
                      ? "Your technician has already arrived on site, so the shop's standard call-out fee will apply if you cancel now."
                      : "Cancelling now is free."}
                  </p>
                  {cancelError && (
                    <p className="mt-2 text-xs text-red-400">{cancelError}</p>
                  )}
                  <div className="mt-2.5 flex gap-2">
                    <button
                      type="button"
                      onClick={handleCancelBooking}
                      disabled={cancelling}
                      className="rounded-full bg-red-500 px-3.5 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {cancelling ? "Cancelling..." : "Yes, Cancel Booking"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCancelConfirm(false)}
                      className="rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-semibold text-slate-300"
                    >
                      Never Mind
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(true)}
                  className="text-xs font-medium text-red-400 hover:text-red-300"
                >
                  Cancel this booking
                </button>
              )}
            </div>
          )}

          {(ticket.description || ticket.request_photo_url) && (
            <div className="mt-4 rounded-xl bg-white/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Original Request
              </p>
              {ticket.description && (
                <p className="mt-1 text-sm text-slate-300">{ticket.description}</p>
              )}
              {ticket.request_photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ticket.request_photo_url}
                  alt="Request photo"
                  className="mt-2 h-24 w-24 rounded-lg object-cover"
                />
              )}
            </div>
          )}

          {staffLocation && (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {ticket.status === "IN_PROGRESS" || ticket.status === "ESTIMATE_PENDING"
                  ? "Your technician is on site"
                  : "Your technician is on the way"}
              </p>
              <div className="mt-2">
                <ShopLocationMap
                  latitude={staffLocation.lat}
                  longitude={staffLocation.lng}
                  variant="technician"
                />
              </div>
            </div>
          )}

          <div className="mt-6 space-y-4">
            <ProofPhoto
              label="Job Start Proof"
              url={ticket.start_photo_url}
              timestamp={ticket.started_at}
              hasGps={ticket.start_lat !== null}
              ticket={ticket}
            />
            <ProofPhoto
              label="Job Completion Proof"
              url={ticket.end_photo_url}
              timestamp={ticket.completed_at}
              hasGps={ticket.end_lat !== null}
              ticket={ticket}
            />
          </div>

          {ticket.signature_url && (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Signature on File
              </p>
              <div className="mt-1.5 rounded-xl bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ticket.signature_url}
                  alt="Signature"
                  className="h-16 w-full object-contain"
                />
              </div>
            </div>
          )}

          {!ticket.start_photo_url && !ticket.end_photo_url && (
            <p className="mt-6 text-sm text-slate-400">
              Your technician hasn&apos;t started this job yet. Check back once
              it&apos;s underway to see live proof photos here.
            </p>
          )}

          {ticket.status === "ESTIMATE_PENDING" && (
            <div className="mt-6 border-t border-white/10 pt-5">
              {ticket.quote_submitted_at ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Estimate From Your Technician
                  </p>
                  <div className="mt-2 space-y-1">
                    {ticket.selected_products.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm text-slate-300">
                        <span>
                          {item.name}
                          {item.quantity > 1 ? ` ×${item.quantity}` : ""}
                        </span>
                        <span>
                          {ticket.currency} {(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {ticket.service_fee > 0 && (
                      <div className="flex justify-between text-sm text-slate-300">
                        <span>Diagnostic Fee</span>
                        <span>
                          {ticket.currency} {ticket.service_fee.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {ticket.total_labor_cost > 0 && (
                      <div className="flex justify-between text-sm text-slate-300">
                        <span>Labor Fee</span>
                        <span>
                          {ticket.currency} {ticket.total_labor_cost.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-white/5 px-3.5 py-2.5">
                    <span className="text-sm font-medium text-white">Total</span>
                    <span className="text-lg font-bold text-brand-emerald">
                      {ticket.currency} {(ticket.total_invoice_amount ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-slate-400">
                    Approving lets your technician begin the repair. Final billing may
                    still differ slightly once the job is complete.
                  </p>

                  {approveError && (
                    <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
                      {approveError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleApproveQuote}
                    disabled={approvingQuote}
                    className="mt-3 w-full rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {approvingQuote ? "Approving..." : "Approve Estimate"}
                  </button>
                </>
              ) : (
                <p className="rounded-lg bg-brand-blue/15 px-4 py-3 text-sm text-brand-blue">
                  Your technician is diagnosing the issue and will send you a quote shortly.
                </p>
              )}
            </div>
          )}

          {ticket.status === "COMPLETED" && (
            <p className="mt-6 rounded-lg bg-brand-blue/15 px-4 py-3 text-sm text-brand-blue">
              Work is done — the business is reviewing it before finalizing.
            </p>
          )}

          {ticket.status === "APPROVED" && (
            <div className="mt-6">
              <p className="rounded-lg bg-brand-emerald/15 px-4 py-3 text-sm text-brand-emerald">
                This job has been approved.
              </p>

              {ticket.warranty_expires_at && (
                <div className="mt-3 rounded-lg bg-white/5 px-4 py-3">
                  {claimedTicketId ? (
                    <>
                      <p className="text-sm font-semibold text-white">
                        Warranty claim submitted!
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        The business will review your follow-up request shortly.
                      </p>
                      <Link
                        href={`/client/${claimedTicketId}`}
                        className="mt-2 inline-block text-xs font-semibold text-brand-blue hover:text-blue-400"
                      >
                        View your claim →
                      </Link>
                    </>
                  ) : new Date(ticket.warranty_expires_at) > new Date() ? (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Warranty Active
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        Covered until{" "}
                        {new Date(ticket.warranty_expires_at).toLocaleDateString()}. Still
                        having the same issue? Claim it for a free follow-up visit.
                      </p>
                      {claimError && (
                        <p className="mt-2 text-xs text-red-400">{claimError}</p>
                      )}
                      <button
                        type="button"
                        onClick={handleClaimWarranty}
                        disabled={claimingWarranty}
                        className="mt-2 rounded-full border border-brand-blue/40 px-4 py-2 text-xs font-semibold text-brand-blue transition-colors hover:bg-brand-sky/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {claimingWarranty ? "Submitting..." : "Claim Warranty"}
                      </button>
                    </>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Warranty expired on{" "}
                      {new Date(ticket.warranty_expires_at).toLocaleDateString()}.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {ticket.status === "DISPUTED" && (
            <div className="mt-6 rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-400">
              <p className="font-semibold">This job was marked as disputed.</p>
              {ticket.dispute_notes && <p className="mt-1">{ticket.dispute_notes}</p>}
            </div>
          )}

          {ticket.status === "CANCELLED" && (
            <div className="mt-6 rounded-lg bg-white/5 px-4 py-3 text-sm text-slate-300">
              <p className="font-semibold text-white">
                This booking was cancelled
                {ticket.cancelled_at &&
                  ` on ${new Date(ticket.cancelled_at).toLocaleDateString()}`}
                .
              </p>
              {ticket.cancellation_reason && (
                <p className="mt-1 text-slate-400">{ticket.cancellation_reason}</p>
              )}
              {ticket.cancellation_fee_applied && (
                <p className="mt-1.5 text-xs text-amber-400">
                  A call-out fee applies since the technician had already arrived.
                </p>
              )}
            </div>
          )}

          {ticket.status !== "ESTIMATE_PENDING" &&
            ticket.total_invoice_amount !== null &&
            ticket.total_invoice_amount > 0 && (
            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Receipt
              </p>
              {ticket.selected_products.length > 0 && (
                <div className="mt-2 space-y-1">
                  {ticket.selected_products.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm text-slate-300">
                      <span>
                        {item.name}
                        {item.quantity > 1 ? ` ×${item.quantity}` : ""}
                      </span>
                      <span>
                        {ticket.currency} {(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {ticket.service_fee > 0 && (
                <div className="mt-1 flex justify-between text-sm text-slate-300">
                  <span>Service Fee</span>
                  <span>
                    {ticket.currency} {ticket.service_fee.toFixed(2)}
                  </span>
                </div>
              )}
              {ticket.tax_amount > 0 && (
                <div className="mt-1 flex justify-between text-sm text-slate-300">
                  <span>Tax</span>
                  <span>
                    {ticket.currency} {ticket.tax_amount.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between rounded-lg bg-white/5 px-3.5 py-2.5">
                <span className="text-sm font-medium text-white">Total</span>
                <span className="text-lg font-bold text-brand-emerald">
                  {ticket.currency} {ticket.total_invoice_amount.toFixed(2)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleDownloadInvoice}
                disabled={downloadingInvoice}
                className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-white/20 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:border-brand-blue hover:text-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="h-3.5 w-3.5" />
                {downloadingInvoice ? "Preparing..." : "Download Invoice (PNG)"}
              </button>

              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Payment Method
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ticket.accepted_payment_methods.map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => handleSelectPayment(method)}
                    disabled={selectingPayment}
                    className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${
                      ticket.payment_method === method
                        ? "bg-brand-blue text-white"
                        : "border border-white/20 text-slate-300 hover:border-brand-blue hover:text-brand-blue"
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
              {ticket.payment_method && (
                <p className="mt-1.5 text-xs text-slate-400">
                  You selected {ticket.payment_method}. Pay the technician or shop directly.
                </p>
              )}

              <div className="mt-4 border-t border-white/10 pt-4">
                {ticket.invoice_paid_at ? (
                  <p className="rounded-lg bg-brand-emerald/15 px-3.5 py-2.5 text-sm font-semibold text-brand-emerald">
                    Payment confirmed — thank you!
                  </p>
                ) : (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Paid already? Upload your receipt
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      A screenshot of your bank transfer or payment confirmation helps
                      the business verify it faster.
                    </p>
                    <div className="mt-2">
                      <PhotoUploadField
                        folder="receipts"
                        photoUrl={ticket.payment_receipt_url}
                        onChange={handleUploadReceipt}
                        label={uploadingReceipt ? "Uploading..." : "Upload payment receipt"}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {["COMPLETED", "APPROVED", "DISPUTED"].includes(ticket.status) && (
            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Rate this job
              </p>
              {review ? (
                <div className="mt-2">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < review.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-600"
                        }`}
                      />
                    ))}
                  </div>
                  {review.comment && (
                    <p className="mt-1.5 text-sm text-slate-300">{review.comment}</p>
                  )}
                  {review.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={review.photo_url}
                      alt="Review photo"
                      className="mt-2 h-24 w-24 rounded-lg object-cover"
                    />
                  )}
                  <p className="mt-1 text-xs text-slate-400">Thanks for your feedback!</p>
                </div>
              ) : (
                <div className="mt-2">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setReviewRating(i + 1)}
                        aria-label={`Rate ${i + 1} stars`}
                      >
                        <Star
                          className={`h-7 w-7 ${
                            i < reviewRating
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-600"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Leave a comment (optional)..."
                    className="mt-2 w-full rounded-xl bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-blue focus:outline-none"
                  />
                  <div className="mt-2">
                    <PhotoUploadField
                      folder="reviews"
                      photoUrl={reviewPhotoUrl}
                      onChange={setReviewPhotoUrl}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmitReview}
                    disabled={reviewRating === 0 || reviewSubmitting}
                    className="mt-2 w-full rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {reviewSubmitting ? "Submitting..." : "Submit Rating"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
