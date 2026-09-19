"use client";

import { useEffect, useState } from "react";
import { Mail, Phone, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { getShopCustomerProfile, type ShopCustomerProfile } from "@/lib/chat/chat";

export default function CustomerProfilePanel({ customerId }: { customerId: string }) {
  const [profile, setProfile] = useState<ShopCustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    getShopCustomerProfile(customerId)
      .then((data) => {
        if (active) setProfile(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [customerId]);

  if (loading || !profile) return null;

  const address = [profile.barangay, profile.city, profile.region].filter(Boolean).join(", ");

  return (
    <div className="mb-3 rounded-2xl bg-white/5 p-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Client Profile
        </p>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {profile.email && (
            <p className="flex items-center gap-2 text-sm text-slate-300">
              <Mail className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              {profile.email}
            </p>
          )}
          {profile.phone && (
            <p className="flex items-center gap-2 text-sm text-slate-300">
              <Phone className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              {profile.phone}
            </p>
          )}
          {address && (
            <p className="flex items-center gap-2 text-sm text-slate-300">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              {address}
            </p>
          )}

          {profile.jobs.length > 0 && (
            <div className="mt-3 border-t border-white/10 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Job History ({profile.jobs.length})
              </p>
              <div className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
                {profile.jobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{job.service_type}</p>
                      <p className="text-slate-500">
                        {new Date(job.created_at).toLocaleDateString()} · {job.status}
                      </p>
                    </div>
                    {job.total_invoice_amount > 0 && (
                      <span className="shrink-0 font-semibold text-brand-emerald">
                        {job.total_invoice_amount.toFixed(2)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
