"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminShopDetail } from "@/lib/admin/shopDetail";

const DAY_ORDER = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const DAY_LABEL: Record<string, string> = { MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat", SUN: "Sun" };

export type AccountSummary = {
  id: string;
  shop_name: string;
  slug: string;
  currency: string;
  created_at: string;
  is_verified: boolean;
  has_quality_booster: boolean;
  has_marketing_tier: boolean;
  unlimited_tech_seats: boolean;
  staff_members: { id: string; full_name: string; email: string; role: "OWNER" | "MANAGER" | "TECHNICIAN" }[];
};

function stars(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(Math.max(0, 5 - rating));
}

function formatTime(value: string | null): string {
  if (!value) return "";
  const [hour, minute] = value.split(":").map(Number);
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** "in 2 days", "in 5 hours" — how long until the automatic removal. */
function timeUntil(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "any moment now";
  const hours = Math.ceil(ms / 3_600_000);
  return hours < 24 ? `in ${hours} hour${hours === 1 ? "" : "s"}` : `in ${Math.ceil(hours / 24)} days`;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 text-right text-slate-900">{children}</dd>
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-brand-slate-light/40 px-3 py-3 text-center shadow-sm shadow-black/10">
      <p className="text-xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

/**
 * One account in full: its profile, owner, the numbers (staff, customers, jobs, reviews), its reviews, and the owner's
 * requests to remove reviews — which go through by themselves after 3 days unless declined here (or removed early).
 */
export default function AccountDetailModal({
  shop,
  onClose,
  onToggleUnlimitedSeats,
  seatsSaving,
  seatsError,
  onRequestsChanged,
}: {
  shop: AccountSummary;
  onClose: () => void;
  onToggleUnlimitedSeats: () => void;
  seatsSaving: boolean;
  seatsError: string | null;
  /** The list behind this window shows a badge for waiting requests; tell it when they change. */
  onRequestsChanged: () => void;
}) {
  const [detail, setDetail] = useState<AdminShopDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/shops/${shop.id}/detail`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setLoadError(body.error ?? "Couldn't load this account.");
      return;
    }
    setDetail((await res.json()) as AdminShopDetail);
    setLoadError(null);
  }, [shop.id]);

  useEffect(() => {
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [load]);

  async function decide(requestId: string, approve: boolean) {
    let note = "";
    if (approve) {
      if (!window.confirm("Remove the ticked reviews now, instead of waiting for the 3 days to pass? The owner is told.")) return;
    } else {
      const answer = window.prompt("Why is it declined? The owner will see this. (Leave empty to skip.)");
      if (answer === null) return;
      note = answer;
    }

    setDeciding(requestId);
    setDecisionError(null);
    const res = await fetch(`/api/admin/review-requests/${requestId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approve, note }),
    });
    setDeciding(null);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setDecisionError(body.error ?? "Couldn't save that decision.");
    }
    await load();
    onRequestsChanged();
  }

  const waiting = detail?.removalRequests.filter((request) => request.status === "PENDING") ?? [];
  const history = detail?.removalRequests.filter((request) => request.status !== "PENDING") ?? [];
  const waitingReviewIds = new Set(
    waiting.flatMap((request) => request.review_deletion_request_items.map((item) => item.review_id))
  );
  const profile = detail?.profile;
  const days = profile ? DAY_ORDER.filter((day) => profile.business_days.includes(day)) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-brand-slate p-6 shadow-2xl shadow-black/40"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{shop.shop_name}</h3>
            <p className="text-xs text-slate-400">/{shop.slug}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-900" aria-label="Close">
            ✕
          </button>
        </div>

        {loadError && (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">{loadError}</p>
        )}
        {!detail && !loadError && <p className="mt-4 text-sm text-slate-500">Loading account...</p>}

        {detail && profile && (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Tile
                label="Staff"
                value={String(detail.counts.staff)}
                hint={`${detail.counts.technicians} technician${detail.counts.technicians === 1 ? "" : "s"}`}
              />
              <Tile label="Customers" value={String(detail.counts.customers)} hint="have booked with them" />
              <Tile
                label="Jobs"
                value={String(detail.counts.jobs)}
                hint={`${detail.counts.jobsOpen} open · ${detail.counts.jobsFinished} finished`}
              />
              <Tile
                label="Reviews"
                value={String(detail.counts.reviews)}
                hint={detail.counts.avgRating !== null ? `${detail.counts.avgRating.toFixed(1)} average` : "no rating yet"}
              />
            </div>

            <div className="mt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Profile</p>
              <dl className="mt-2 space-y-2 text-sm">
                <Row label="Owner">
                  {detail.owner ? (
                    <>
                      {detail.owner.full_name}
                      <span className="block text-xs text-slate-400">{detail.owner.email}</span>
                      {detail.owner.phone && <span className="block text-xs text-slate-400">{detail.owner.phone}</span>}
                    </>
                  ) : (
                    <span className="text-slate-400">No owner on record</span>
                  )}
                </Row>
                <Row label="Address">
                  {[profile.address, profile.city, profile.region, profile.country].filter(Boolean).join(", ") || (
                    <span className="text-slate-400">Not set</span>
                  )}
                </Row>
                <Row label="Map pin">{profile.latitude !== null && profile.longitude !== null ? "Pinned" : <span className="text-amber-500">Not pinned</span>}</Row>
                <Row label="Category">{profile.business_category ?? <span className="text-slate-400">Not set</span>}</Row>
                <Row label="Contact number">{profile.contact_phone ?? <span className="text-slate-400">Not set</span>}</Row>
                <Row label="Working hours">
                  {profile.business_hours_open && profile.business_hours_close && days.length > 0 ? (
                    <>
                      {days.length === 7 ? "Every day" : days.map((day) => DAY_LABEL[day]).join(", ")}
                      <span className="block text-xs text-slate-400">
                        {formatTime(profile.business_hours_open)} – {formatTime(profile.business_hours_close)}
                      </span>
                    </>
                  ) : (
                    <span className="text-amber-500">Not set</span>
                  )}
                </Row>
                <Row label="Shown to customers">{profile.is_publicly_listed ? "Yes" : "No"}</Row>
                <Row label="Night shift">{profile.night_shift_enabled ? "On" : "Off"}</Row>
                <Row label="Currency">{profile.currency}</Row>
                <Row label="Created">{new Date(profile.created_at).toLocaleString()}</Row>
                {detail.counts.lastJobAt && <Row label="Last job">{new Date(detail.counts.lastJobAt).toLocaleString()}</Row>}
              </dl>
              {detail.branches.length === 0 ? (
                <p className="mt-2 text-[11px] text-slate-400">
                  Single-location account — no branches added beyond the address above (its Main Branch).
                </p>
              ) : (
                <div className="mt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Branches ({detail.branches.length})
                  </p>
                  <div className="mt-2 space-y-2">
                    {detail.branches.map((branch) => (
                      <div key={branch.id} className="rounded-xl bg-brand-slate-light/40 px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">{branch.name}</p>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              branch.is_active ? "bg-brand-emerald/15 text-brand-emerald-dark" : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            {branch.is_active ? "Active" : "Deactivated"}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{branch.address}</p>
                        <p className="mt-1.5 text-xs text-slate-500">
                          Manager:{" "}
                          {branch.manager ? (
                            <span className="text-slate-900">{branch.manager.full_name}</span>
                          ) : (
                            <span className="text-amber-500">Unassigned</span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {branch.technician_count} tech{branch.technician_count === 1 ? "" : "s"} ·{" "}
                          {branch.job_count} job{branch.job_count === 1 ? "" : "s"} ·{" "}
                          {branch.customer_count} customer{branch.customer_count === 1 ? "" : "s"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Review removal requests {waiting.length > 0 && <span className="text-amber-500">({waiting.length} waiting)</span>}
              </p>
              {decisionError && <p className="mt-2 text-xs text-red-400">{decisionError}</p>}

              {waiting.length === 0 && history.length === 0 && (
                <p className="mt-2 text-sm text-slate-400">This owner hasn&apos;t asked to remove any reviews.</p>
              )}

              {waiting.map((request) => (
                <div key={request.id} className="mt-3 rounded-2xl border border-amber-300/60 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">
                    {request.review_deletion_request_items.length} review
                    {request.review_deletion_request_items.length === 1 ? "" : "s"} — removed automatically{" "}
                    {timeUntil(request.delete_after)} ({new Date(request.delete_after).toLocaleDateString()})
                  </p>
                  <p className="mt-0.5 text-xs text-amber-900/80">
                    Asked {new Date(request.created_at).toLocaleString()}
                    {request.reason ? ` — “${request.reason}”` : " — no reason given"}
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {request.review_deletion_request_items.map((item) => (
                      <li key={item.id} className="rounded-xl bg-white px-3 py-2 text-xs text-slate-700">
                        <span className="text-amber-500">{stars(item.rating)}</span>{" "}
                        <span className="font-semibold">{item.client_name ?? "Customer"}</span>
                        <span className="block text-slate-600">{item.comment?.trim() || "No comment — rating only."}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => decide(request.id, true)}
                      disabled={deciding === request.id}
                      className="rounded-full border border-red-500/40 bg-white px-3.5 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Remove now
                    </button>
                    <button
                      type="button"
                      onClick={() => decide(request.id, false)}
                      disabled={deciding === request.id}
                      className="rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-900 transition-colors hover:border-brand-blue hover:text-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Decline — keep the reviews
                    </button>
                  </div>
                </div>
              ))}

              {history.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {history.map((request) => (
                    <li key={request.id} className="rounded-xl bg-brand-slate-light/30 px-3 py-2 text-xs text-slate-600">
                      <span className="font-semibold text-slate-900">{request.status}</span> ·{" "}
                      {request.review_deletion_request_items.length} review
                      {request.review_deletion_request_items.length === 1 ? "" : "s"} · asked{" "}
                      {new Date(request.created_at).toLocaleDateString()}
                      {request.decided_at ? ` · decided ${new Date(request.decided_at).toLocaleDateString()}` : ""}
                      {request.decision_note ? ` — ${request.decision_note}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Reviews ({detail.counts.reviews})</p>
              {detail.reviews.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400">No reviews yet.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {detail.reviews.map((review) => (
                    <li key={review.id} className="rounded-xl bg-brand-slate-light/30 px-3 py-2.5 text-sm shadow-sm shadow-black/10">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-amber-500">{stars(review.rating)}</span>
                        <span className="text-xs font-semibold text-slate-900">{review.client_name ?? "Customer"}</span>
                        <span className="text-xs text-slate-400">{new Date(review.created_at).toLocaleDateString()}</span>
                        {waitingReviewIds.has(review.id) && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Removal requested</span>
                        )}
                      </div>
                      <p className="mt-1 text-slate-700">{review.comment?.trim() || <span className="text-slate-400">No comment — rating only.</span>}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        <dl className="mt-6 space-y-3 text-sm">
          <Row label="Verified">{shop.is_verified ? "Yes" : "No"}</Row>
          <Row label="Quality Booster">{shop.has_quality_booster ? "Active" : "Not active"}</Row>
          <Row label="Marketing Suite">{shop.has_marketing_tier ? "Active" : "Not active"}</Row>
          <Row label="Technician seats">
            {shop.unlimited_tech_seats ? "Unlimited (test account)" : "1 free, more are paid"}
          </Row>
        </dl>

        <div className="mt-5 rounded-2xl bg-brand-slate-light/30 p-4">
          <p className="text-xs text-slate-400">
            Testing an account? Unlimited seats lets the owner add as many technicians as needed without the paid-seat prompt.
          </p>
          <button
            type="button"
            onClick={onToggleUnlimitedSeats}
            disabled={seatsSaving}
            className="mt-3 rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-900 transition-colors hover:border-brand-blue hover:text-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
          >
            {seatsSaving ? "Saving..." : shop.unlimited_tech_seats ? "Remove unlimited seats" : "Give unlimited tech seats"}
          </button>
          {seatsError && <p className="mt-2 text-xs text-red-400">{seatsError}</p>}
        </div>

        <div className="mt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Staff ({shop.staff_members.length})</p>
          <div className="mt-2 space-y-2">
            {shop.staff_members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-xl bg-brand-slate-light/30 px-3 py-2 text-sm shadow-sm shadow-black/20"
              >
                <div>
                  <p className="text-slate-900">{member.full_name}</p>
                  <p className="text-xs text-slate-400">{member.email}</p>
                </div>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{member.role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
