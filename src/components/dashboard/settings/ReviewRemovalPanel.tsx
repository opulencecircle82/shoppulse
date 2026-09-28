"use client";

import { useCallback, useEffect, useState } from "react";
import { Star } from "lucide-react";
import {
  REVIEW_REMOVAL_WAIT_DAYS,
  cancelReviewRemoval,
  listReviewRemovalRequests,
  listReviewsForModeration,
  requestReviewRemoval,
} from "@/lib/dashboard/reviewRemoval";
import type { ReviewForModeration, ReviewRemovalRequest, ReviewRemovalStatus } from "@/lib/supabase/types";

const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const STATUS_STYLE: Record<ReviewRemovalStatus, { label: string; chip: string }> = {
  PENDING: { label: "Waiting", chip: "bg-amber-100 text-amber-800" },
  APPROVED: { label: "Removed", chip: "bg-brand-emerald/15 text-brand-emerald-dark" },
  REJECTED: { label: "Declined", chip: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Cancelled", chip: "bg-slate-100 text-slate-600" },
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i < rating ? "fill-amber-400 text-amber-500" : "text-slate-300"}`} />
      ))}
    </span>
  );
}

/**
 * Settings → Review Removal. The owner ticks the reviews they want gone (unfair, fake, not their customer) and sends
 * a request. It waits 3 days — ShopPulse can decline it in that time — and then exactly the ticked reviews are removed.
 */
export default function ReviewRemovalPanel() {
  const [reviews, setReviews] = useState<ReviewForModeration[] | null>(null);
  const [requests, setRequests] = useState<ReviewRemovalRequest[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [reviewRows, requestRows] = await Promise.all([listReviewsForModeration(), listReviewRemovalRequests()]);
      setReviews(reviewRows);
      setRequests(requestRows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your reviews.");
      setReviews((current) => current ?? []);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [load]);

  function toggle(id: string) {
    setSentMessage(null);
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSend() {
    setSending(true);
    setError(null);
    setSentMessage(null);
    try {
      await requestReviewRemoval(Array.from(picked), reason);
      const when = new Date(Date.now() + REVIEW_REMOVAL_WAIT_DAYS * 86_400_000).toISOString();
      setSentMessage(
        `Request sent. The ${picked.size === 1 ? "review" : `${picked.size} reviews`} will be removed on ${shortDate(when)} unless ShopPulse declines it.`
      );
      setPicked(new Set());
      setReason("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send the request.");
    } finally {
      setSending(false);
    }
  }

  async function handleCancel(requestId: string) {
    setCancellingId(requestId);
    setError(null);
    try {
      await cancelReviewRemoval(requestId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't cancel the request.");
    } finally {
      setCancellingId(null);
    }
  }

  if (reviews === null) return <p className="text-sm text-slate-500">Loading reviews...</p>;

  const waiting = requests.filter((request) => request.status === "PENDING");
  const history = requests.filter((request) => request.status !== "PENDING");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Ask to remove reviews</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Tick the reviews that are unfair, fake or from someone who wasn&apos;t your customer, and send a request.
          ShopPulse looks at it; the ticked reviews are removed {REVIEW_REMOVAL_WAIT_DAYS} days after you send it,
          unless it is declined.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">{error}</p>
      )}
      {sentMessage && (
        <p className="rounded-lg border border-brand-emerald/30 bg-brand-emerald/10 px-3.5 py-2.5 text-sm text-brand-emerald-dark">
          {sentMessage}
        </p>
      )}

      {waiting.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-900">Waiting to be removed</p>
          {waiting.map((request) => (
            <div key={request.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-amber-900">
                  {request.review_deletion_request_items.length} review
                  {request.review_deletion_request_items.length === 1 ? "" : "s"} — removed on{" "}
                  {shortDate(request.delete_after)}
                </p>
                <button
                  type="button"
                  onClick={() => handleCancel(request.id)}
                  disabled={cancellingId === request.id}
                  className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cancellingId === request.id ? "Cancelling..." : "Cancel request"}
                </button>
              </div>
              {request.reason && <p className="mt-1 text-xs text-amber-900/80">Your reason: {request.reason}</p>}
            </div>
          ))}
        </div>
      )}

      <div>
        <p className="text-sm font-semibold text-slate-900">Your reviews ({reviews.length})</p>
        {reviews.length === 0 ? (
          <p className="mt-2 rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
            You don&apos;t have any reviews yet.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-200">
            {reviews.map((review) => {
              const isWaiting = review.pending_request_id !== null;
              return (
                <li key={review.id}>
                  <label
                    className={`flex items-start gap-3 px-4 py-3 ${isWaiting ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-slate-50"}`}
                  >
                    <input
                      type="checkbox"
                      checked={isWaiting || picked.has(review.id)}
                      disabled={isWaiting}
                      onChange={() => toggle(review.id)}
                      className="mt-1 h-4 w-4 shrink-0 accent-brand-blue"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Stars rating={review.rating} />
                        <span className="text-xs font-semibold text-slate-700">{review.client_name}</span>
                        <span className="text-xs text-slate-400">{shortDate(review.created_at)}</span>
                        {isWaiting && review.pending_delete_after && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            Removal requested — goes {shortDate(review.pending_delete_after)}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-sm text-slate-700">
                        {review.comment?.trim() || <span className="text-slate-400">No comment — rating only.</span>}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        {picked.size > 0 && (
          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="review-removal-reason" className="block text-sm font-medium text-slate-600">
                Why should {picked.size === 1 ? "it" : "they"} be removed? (optional)
              </label>
              <textarea
                id="review-removal-reason"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                placeholder="e.g. This person was never our customer."
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? "Sending..." : `Request removal of ${picked.size} review${picked.size === 1 ? "" : "s"}`}
            </button>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-slate-900">Earlier requests</p>
          <ul className="mt-2 space-y-2">
            {history.map((request) => (
              <li key={request.id} className="rounded-xl border border-slate-200 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-slate-700">
                    {request.review_deletion_request_items.length} review
                    {request.review_deletion_request_items.length === 1 ? "" : "s"} · asked {shortDate(request.created_at)}
                  </p>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLE[request.status].chip}`}>
                    {STATUS_STYLE[request.status].label}
                    {request.decided_at ? ` ${shortDate(request.decided_at)}` : ""}
                  </span>
                </div>
                {request.decision_note && <p className="mt-1 text-xs text-slate-500">{request.decision_note}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
