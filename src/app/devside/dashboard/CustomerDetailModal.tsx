"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminCustomerDetail } from "@/lib/admin/customerDetail";

export type AdminCustomerSummary = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  created_at: string;
  booking_count: number;
};

const STATUS_STYLE: Record<string, string> = {
  CANCELLED: "bg-slate-200 text-slate-500",
  IN_PROGRESS: "bg-brand-sky/15 text-brand-blue-dark",
  SCHEDULED: "bg-amber-100 text-amber-800",
  APPROVED: "bg-brand-emerald/15 text-brand-emerald-dark",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 text-right text-slate-900">{children}</dd>
    </div>
  );
}

/** One customer in full, read-only: their profile and their whole booking history across every shop. */
export default function CustomerDetailModal({
  customer,
  onClose,
}: {
  customer: AdminCustomerSummary;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<AdminCustomerDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/customers/${customer.id}/detail`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setLoadError(body.error ?? "Couldn't load this customer.");
      return;
    }
    setDetail((await res.json()) as AdminCustomerDetail);
    setLoadError(null);
  }, [customer.id]);

  useEffect(() => {
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [load]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-brand-slate p-6 shadow-2xl shadow-black/40"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{customer.full_name}</h3>
            <p className="text-xs text-slate-400">{customer.email}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-900" aria-label="Close">
            ✕
          </button>
        </div>

        {loadError && (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">{loadError}</p>
        )}
        {!detail && !loadError && <p className="mt-4 text-sm text-slate-500">Loading customer...</p>}

        {detail && (
          <>
            <dl className="mt-5 space-y-2 text-sm">
              <Row label="Phone">{detail.profile.phone ?? <span className="text-slate-400">Not set</span>}</Row>
              <Row label="Location">
                {[detail.profile.barangay, detail.profile.city, detail.profile.region, detail.profile.country]
                  .filter(Boolean)
                  .join(", ") || <span className="text-slate-400">Not set</span>}
              </Row>
              <Row label="Registered">{new Date(detail.profile.created_at).toLocaleString()}</Row>
              <Row label="Total bookings">{detail.bookings.length}</Row>
            </dl>

            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Booking history ({detail.bookings.length})
              </p>
              {detail.bookings.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400">No bookings yet.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {detail.bookings.map((booking) => (
                    <li
                      key={booking.id}
                      className="rounded-xl bg-brand-slate-light/30 px-3 py-2.5 text-sm shadow-sm shadow-black/10"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900">{booking.shop_name}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            STATUS_STYLE[booking.status] ?? "bg-slate-200 text-slate-500"
                          }`}
                        >
                          {booking.status}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-600">{booking.service_type}</p>
                      <p className="mt-1 text-xs text-slate-400">{new Date(booking.created_at).toLocaleString()}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
