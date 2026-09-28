"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { listShopCustomers, type ShopCustomer } from "@/lib/chat/chat";

export default function NewCustomerMessageModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (customer: ShopCustomer) => void;
}) {
  const [customers, setCustomers] = useState<ShopCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listShopCustomers()
      .then(setCustomers)
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter((c) =>
    c.fullName.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/10"
      >
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-slate-900">New Message</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Only customers who&apos;ve booked a job with you can be messaged.
        </p>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="mt-4 w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
        />

        <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
          {loading ? (
            <p className="py-6 text-center text-sm text-slate-500">Loading customers...</p>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              {customers.length === 0 ? "No customers yet." : "No matches."}
            </p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.customerId}
                type="button"
                onClick={() => onSelect(c)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-100"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-orange/15 text-xs font-bold text-brand-orange-dark">
                  {c.fullName.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{c.fullName}</p>
                  <p className="truncate text-xs text-slate-500">
                    {c.jobCount} job{c.jobCount === 1 ? "" : "s"} with you
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
