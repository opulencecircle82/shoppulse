"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Star } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
  fetchTicketStaffLocation,
  fetchTicketReview,
  submitShopReview,
} from "@/lib/customer/bookings";
import PhotoUploadField from "@/components/shared/PhotoUploadField";

const ShopLocationMap = dynamic(
  () => import("@/components/customer/ShopLocationMap"),
  { ssr: false, loading: () => <div className="h-[180px] rounded-xl bg-slate-100" /> }
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
  watermark_show_logo: boolean;
  watermark_show_timestamp: boolean;
  watermark_show_gps: boolean;
  start_lat: number | null;
  start_lng: number | null;
  end_lat: number | null;
  end_lng: number | null;
  total_invoice_amount: number | null;
  currency: string;
  selected_products: { product_id: string; name: string; price: number; quantity: number }[];
  payment_method: string | null;
  accepted_payment_methods: string[];
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
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className="relative mt-1.5 aspect-video overflow-hidden rounded-xl bg-slate-100 shadow-sm">
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
  const ticketId = params.ticketId as string;

  const [ticket, setTicket] = useState<ClientTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disputeNotes, setDisputeNotes] = useState("");
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [submitting, setSubmitting] = useState<"approve" | "dispute" | null>(null);
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
    if (!ticket || (ticket.status !== "SCHEDULED" && ticket.status !== "IN_PROGRESS")) return;

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

  async function handleSelectPayment(method: string) {
    setSelectingPayment(true);
    await supabase.rpc("client_select_payment_method", {
      p_ticket_id: ticketId,
      p_method: method,
    });
    setSelectingPayment(false);
    await load();
  }

  async function handleApprove() {
    setSubmitting("approve");
    await supabase.rpc("client_approve_ticket", { p_ticket_id: ticketId });
    setSubmitting(null);
    await load();
  }

  async function handleDispute() {
    if (!disputeNotes.trim()) return;
    setSubmitting("dispute");
    await supabase.rpc("client_dispute_ticket", {
      p_ticket_id: ticketId,
      p_notes: disputeNotes,
    });
    setSubmitting(null);
    await load();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
      </main>
    );
  }

  if (error || !ticket) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
        <p className="text-sm text-slate-500">{error}</p>
      </main>
    );
  }

  const canReview = ticket.status === "COMPLETED";

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center gap-3">
          {ticket.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ticket.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
          )}
          <div>
            <p className="text-lg font-bold text-slate-900">{ticket.shop_name}</p>
            <p className="text-xs text-slate-500">Job verification</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-md shadow-slate-900/5">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              ticket.status === "APPROVED"
                ? "bg-emerald-50 text-emerald-600"
                : ticket.status === "DISPUTED"
                  ? "bg-red-50 text-red-600"
                  : "bg-blue-50 text-brand-blue"
            }`}
          >
            {ticket.status.replace("_", " ")}
          </span>

          <h1 className="mt-3 text-xl font-bold text-slate-900">{ticket.service_type}</h1>
          <p className="mt-1 text-sm text-slate-500">{ticket.service_address}</p>
          <p className="mt-1 text-sm text-slate-500">For: {ticket.client_name}</p>

          {(ticket.description || ticket.request_photo_url) && (
            <div className="mt-4 rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Original Request
              </p>
              {ticket.description && (
                <p className="mt-1 text-sm text-slate-600">{ticket.description}</p>
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
                {ticket.status === "IN_PROGRESS"
                  ? "Your technician is on site"
                  : "Your technician is on the way"}
              </p>
              <div className="mt-2">
                <ShopLocationMap latitude={staffLocation.lat} longitude={staffLocation.lng} />
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

          {!ticket.start_photo_url && !ticket.end_photo_url && (
            <p className="mt-6 text-sm text-slate-500">
              Your technician hasn&apos;t started this job yet. Check back once
              it&apos;s underway to see live proof photos here.
            </p>
          )}

          {ticket.status === "APPROVED" && (
            <p className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              You approved this job. Thank you!
            </p>
          )}

          {ticket.status === "DISPUTED" && (
            <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              <p className="font-semibold">You disputed this job.</p>
              {ticket.dispute_notes && <p className="mt-1">{ticket.dispute_notes}</p>}
            </div>
          )}

          {canReview && !showDisputeForm && (
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleApprove}
                disabled={submitting !== null}
                className="w-full rounded-full bg-brand-emerald px-6 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting === "approve" ? "Approving..." : "Approve Job"}
              </button>
              <button
                type="button"
                onClick={() => setShowDisputeForm(true)}
                disabled={submitting !== null}
                className="w-full rounded-full border border-red-300 px-6 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
              >
                Report a Problem
              </button>
            </div>
          )}

          {canReview && showDisputeForm && (
            <div className="mt-6">
              <label className="block text-xs font-medium text-slate-500">
                What went wrong?
              </label>
              <textarea
                rows={3}
                value={disputeNotes}
                onChange={(e) => setDisputeNotes(e.target.value)}
                placeholder="Tell us what happened..."
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
              />
              <div className="mt-3 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleDispute}
                  disabled={submitting !== null || !disputeNotes.trim()}
                  className="w-full rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting === "dispute" ? "Submitting..." : "Submit Dispute"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDisputeForm(false)}
                  className="w-full rounded-full border border-slate-200 px-6 py-3 text-sm font-medium text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {ticket.total_invoice_amount !== null && ticket.total_invoice_amount > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Receipt
              </p>
              {ticket.selected_products.length > 0 && (
                <div className="mt-2 space-y-1">
                  {ticket.selected_products.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm text-slate-600">
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
              <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 px-3.5 py-2.5">
                <span className="text-sm font-medium text-slate-700">Total</span>
                <span className="text-lg font-bold text-brand-emerald">
                  {ticket.currency} {ticket.total_invoice_amount.toFixed(2)}
                </span>
              </div>

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
                        : "border border-slate-300 text-slate-600 hover:border-brand-blue hover:text-brand-blue"
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
            </div>
          )}

          {["COMPLETED", "APPROVED", "DISPUTED"].includes(ticket.status) && (
            <div className="mt-6 border-t border-slate-100 pt-5">
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
                            : "text-slate-300"
                        }`}
                      />
                    ))}
                  </div>
                  {review.comment && (
                    <p className="mt-1.5 text-sm text-slate-600">{review.comment}</p>
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
                              : "text-slate-300"
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
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
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
                    className="mt-2 w-full rounded-full bg-brand-blue px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
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
