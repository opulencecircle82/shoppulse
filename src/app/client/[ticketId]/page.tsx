"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Download, MessageCircle, Star } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
  fetchTicketStaffLocation,
  fetchTicketReview,
  submitShopReview,
  uploadPaymentReceipt,
  confirmClientPayment,
  cancelBooking,
  fetchTicketPaymentInfo,
  type TicketPaymentInfo,
} from "@/lib/customer/bookings";
import PhotoUploadField from "@/components/shared/PhotoUploadField";
import PaymentDetails from "@/components/customer/PaymentDetails";
import RequestProgress from "@/components/customer/RequestProgress";
import TechLiveCard from "@/components/customer/TechLiveCard";
import { fetchCurrentCustomer } from "@/lib/customer/customerAuth";
import { ensureCustomerConversation } from "@/lib/chat/chat";
import { requestProgress } from "@/lib/customer/jobStages";
import { formatJobNumber } from "@/lib/jobNumber";
import { downloadInvoicePng } from "@/lib/invoice/renderInvoicePng";
import { useSmartBack } from "@/lib/hooks/useSmartBack";
import { useAppTheme, type AppTheme } from "@/lib/hooks/useAppTheme";
import { subscribeToJobTickets } from "@/lib/realtime/jobTicketChanges";

const ShopLocationMap = dynamic(
  () => import("@/components/customer/ShopLocationMap"),
  { ssr: false, loading: () => <div className="h-[180px] rounded-xl bg-white/5" /> }
);

const LIVE_POLL_MS = 15000;
const TICKET_POLL_MS = 8000;
const TRACKED_STATUSES = ["SCHEDULED", "ESTIMATE_PENDING", "IN_PROGRESS"];

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
  client_payment_confirmed_at: string | null;
  en_route_at: string | null;
  staff_accepted_at: string | null;
  created_at: string;
  shop_slug: string;
  booking_latitude: number | null;
  booking_longitude: number | null;
  job_number: number | null;
  mobile_app_theme: AppTheme;
  payment_status: "UNPAID" | "PAID";
};

/** The same wording the customer sees on their bookings list, so the two never disagree. */
function clientStatusLabel(ticket: ClientTicket): string {
  switch (ticket.status) {
    case "PENDING":
      return "Waiting For The Shop";
    case "UNASSIGNED":
      return "Waiting For A Technician";
    case "SCHEDULED":
      if (ticket.en_route_at) return "Technician On The Way";
      return ticket.staff_accepted_at ? "Technician Preparing" : "Technician Assigned";
    case "ESTIMATE_PENDING":
      return ticket.quote_submitted_at && !ticket.quote_approved_at
        ? "Quote Ready"
        : "Technician On Site";
    case "IN_PROGRESS":
      return "Work In Progress";
    case "COMPLETED":
      return "Completed";
    default:
      return ticket.status.replace("_", " ");
  }
}

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
  const router = useRouter();
  const goBack = useSmartBack("/customer");
  const ticketId = params.ticketId as string;

  const [ticket, setTicket] = useState<ClientTicket | null>(null);
  // This page follows the shop's chosen look (dark until the job has loaded).
  useAppTheme(ticket?.mobile_app_theme);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staffLocation, setStaffLocation] = useState<{ lat: number; lng: number; updated_at: string } | null>(null);
  const [openingChat, setOpeningChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
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
  const [uploadReceiptError, setUploadReceiptError] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<TicketPaymentInfo | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [confirmPaymentError, setConfirmPaymentError] = useState<string | null>(null);
  const [approvingQuote, setApprovingQuote] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [claimingWarranty, setClaimingWarranty] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const lastTicketRef = useRef("");
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

    lastTicketRef.current = JSON.stringify(data);
    setTicket(data as ClientTicket);
    setLoading(false);
    supabase.rpc("client_mark_viewed", { p_ticket_id: ticketId });
  }, [ticketId]);

  // The technician and the shop keep moving this job along (on the way,
  // arrived, quote ready, done...). Pick that up without the customer having
  // to reload — and only redraw when something actually changed.
  const refreshQuietly = useCallback(async () => {
    if (document.hidden) return;
    try {
      const { data } = await supabase
        .rpc("get_client_ticket", { p_ticket_id: ticketId })
        .maybeSingle();
      if (!data) return;
      const snapshot = JSON.stringify(data);
      if (snapshot === lastTicketRef.current) return;
      lastTicketRef.current = snapshot;
      setTicket(data as ClientTicket);
    } catch {
      // A dropped connection just skips this check; the next one retries.
    }
  }, [ticketId]);

  useEffect(() => {
    const interval = setInterval(refreshQuietly, TICKET_POLL_MS);
    // Instant when signed in as this job's customer; anyone else relies on the poll above.
    const stopRealtime = subscribeToJobTickets(`client-ticket-${ticketId}`, `id=eq.${ticketId}`, refreshQuietly);
    const onVisible = () => {
      if (!document.hidden) refreshQuietly();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      stopRealtime();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshQuietly, ticketId]);

  useEffect(() => {
    const id = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(id);
  }, [load]);

  // The shop's bank / PayPal / QR details, once the job is far enough along to pay for.
  const paymentOpen = ticket
    ? ticket.status === "IN_PROGRESS" || ticket.status === "COMPLETED" || ticket.status === "APPROVED"
    : false;
  useEffect(() => {
    if (!paymentOpen) return;
    let active = true;
    fetchTicketPaymentInfo(ticketId)
      .then((info) => {
        if (active) setPaymentInfo(info);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [paymentOpen, ticketId]);

  // "Pay Now" from the customer's home screen lands right on the payment section.
  const hasTicket = ticket !== null;
  useEffect(() => {
    if (hasTicket && window.location.hash === "#pay") {
      document.getElementById("pay")?.scrollIntoView({ block: "start" });
    }
  }, [hasTicket]);

  const ticketStatus = ticket?.status;

  useEffect(() => {
    if (!ticketStatus || !TRACKED_STATUSES.includes(ticketStatus)) return;

    let active = true;
    async function poll() {
      const loc = await fetchTicketStaffLocation(ticketId).catch(() => null);
      if (active) setStaffLocation(loc);
    }
    poll();
    const interval = setInterval(poll, LIVE_POLL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [ticketStatus, ticketId]);

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

  // "Message us": the customer's own chat with the shop. Someone who only has the link (not signed in)
  // is sent to the customer app's sign-in first.
  async function handleMessageShop() {
    if (!ticket) return;
    setOpeningChat(true);
    setChatError(null);
    try {
      const customer = await fetchCurrentCustomer();
      if (!customer) {
        router.push("/customer");
        return;
      }
      const conversationId = await ensureCustomerConversation(ticket.shop_slug);
      router.push(`/customer/messages/${conversationId}`);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "Couldn't open the chat. Try again.");
    } finally {
      setOpeningChat(false);
    }
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
    setUploadReceiptError(null);
    try {
      await uploadPaymentReceipt(ticketId, url);
      await load();
    } catch (e) {
      setUploadReceiptError(e instanceof Error ? e.message : "Could not save your proof of payment.");
    } finally {
      setUploadingReceipt(false);
    }
  }

  async function handleConfirmPayment() {
    setConfirmingPayment(true);
    setConfirmPaymentError(null);
    try {
      await confirmClientPayment(ticketId);
      await load();
    } catch (e) {
      setConfirmPaymentError(e instanceof Error ? e.message : "Could not confirm payment.");
    } finally {
      setConfirmingPayment(false);
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
          ticketNumber: formatJobNumber(ticket.job_number, ticket.id),
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
            {clientStatusLabel(ticket)}
          </span>

          <h1 className="mt-3 text-xl font-bold text-white">{ticket.service_type}</h1>
          <p className="mt-0.5 text-xs font-bold tracking-wide text-slate-400">
            Ticket {formatJobNumber(ticket.job_number, ticket.id)}
          </p>
          <p className="mt-1 text-sm text-slate-400">{ticket.service_address}</p>
          <p className="mt-1 text-sm text-slate-400">For: {ticket.client_name}</p>

          {(() => {
            const progress = requestProgress(ticket);
            const enRoute = ticket.status === "SCHEDULED" && Boolean(ticket.en_route_at);
            const destination =
              ticket.booking_latitude !== null && ticket.booking_longitude !== null
                ? { lat: ticket.booking_latitude, lng: ticket.booking_longitude }
                : null;
            const messageButton = (
              <div>
                <button
                  type="button"
                  onClick={handleMessageShop}
                  disabled={openingChat}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-bold text-slate-200 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <MessageCircle className="h-4 w-4" />
                  {openingChat ? "Opening chat..." : "Message us"}
                </button>
                {chatError && (
                  <p role="alert" className="mt-2 text-xs text-red-400">
                    {chatError}
                  </p>
                )}
              </div>
            );
            return (
              <>
                {enRoute && (
                  <TechLiveCard location={staffLocation} destination={destination}>
                    {messageButton}
                  </TechLiveCard>
                )}
                {progress && <RequestProgress progress={progress} compact={enRoute} />}
                {progress && !enRoute && <div className="mt-3">{messageButton}</div>}
              </>
            );
          })()}

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

          {staffLocation && !(ticket.status === "SCHEDULED" && ticket.en_route_at) && (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {ticket.status === "IN_PROGRESS" || ticket.status === "ESTIMATE_PENDING"
                  ? "Your technician is on site"
                  : ticket.en_route_at
                    ? "Your technician is on the way"
                    : "Your technician is getting ready"}
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
            <div id="pay" className="mt-6 scroll-mt-4 border-t border-white/10 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Receipt · Ticket {formatJobNumber(ticket.job_number, ticket.id)}
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

              <PaymentDetails info={paymentInfo} />

              <div className="mt-4 border-t border-white/10 pt-4">
                {ticket.invoice_paid_at ? (
                  <p className="rounded-lg bg-brand-emerald/15 px-3.5 py-2.5 text-sm font-semibold text-brand-emerald">
                    Payment confirmed — thank you!
                  </p>
                ) : ticket.payment_status === "PAID" ? (
                  <div>
                    <p className="rounded-lg bg-brand-emerald/15 px-3.5 py-2.5 text-sm font-semibold text-brand-emerald">
                      ✓ Payment received — thank you! {ticket.shop_name} and your technician have
                      been notified.
                    </p>
                    {ticket.payment_receipt_url && (
                      <a
                        href={ticket.payment_receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center gap-2 text-xs text-slate-400 hover:text-white"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ticket.payment_receipt_url}
                          alt="Your proof of payment"
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                        Your proof of payment — view full size
                      </a>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Sent your payment?
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Upload a screenshot of your transfer or your reference number. Your technician
                      can finish the job as soon as it&apos;s uploaded.
                    </p>
                    {ticket.payment_receipt_url && (
                      <p className="mt-2 rounded-lg bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-400">
                        Proof uploaded — {ticket.shop_name} will review it shortly. You can replace it
                        below.
                      </p>
                    )}
                    <div className="mt-2">
                      <PhotoUploadField
                        folder="receipts"
                        allowGallery
                        photoUrl={ticket.payment_receipt_url}
                        onChange={handleUploadReceipt}
                        label={uploadingReceipt ? "Uploading..." : "Upload Payment Proof / Screenshot"}
                      />
                    </div>
                    {uploadReceiptError && (
                      <p className="mt-1.5 text-xs text-red-400">{uploadReceiptError}</p>
                    )}

                    <div className="mt-4 border-t border-white/10 pt-4">
                      {ticket.client_payment_confirmed_at ? (
                        <p className="rounded-lg bg-brand-emerald/15 px-3.5 py-2.5 text-sm font-semibold text-brand-emerald">
                          ✓ You said you paid — {ticket.shop_name} will verify it shortly.
                        </p>
                      ) : (
                        <>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Paid in cash?
                          </p>
                          <button
                            type="button"
                            onClick={handleConfirmPayment}
                            disabled={confirmingPayment}
                            className="mt-2 w-full rounded-full bg-brand-emerald px-4 py-2.5 text-sm font-bold text-brand-slate transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {confirmingPayment ? "Confirming..." : "Confirm I've Paid"}
                          </button>
                          {confirmPaymentError && (
                            <p className="mt-1.5 text-xs text-red-400">{confirmPaymentError}</p>
                          )}
                        </>
                      )}
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
