"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Shop } from "@/lib/supabase/types";

const AVAILABLE_METHODS = ["Cash", "GCash", "Bank Transfer", "Credit/Debit Card", "PayMaya"];

export default function PaymentMethodsPanel({
  shop,
  onSaved,
}: {
  shop: Shop | null;
  onSaved: () => void;
}) {
  const [methods, setMethods] = useState<string[]>(
    shop?.accepted_payment_methods ?? ["Cash"]
  );
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!shop) {
    return (
      <p className="text-sm text-slate-500">
        Set up your Company Profile first to configure payment methods.
      </p>
    );
  }

  function toggleMethod(method: string) {
    if (method === "Cash") return; // Always accepted, can't be turned off.
    setMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  }

  async function handleSave() {
    setSaving(true);
    setSuccess(false);
    await supabase
      .from("shops")
      .update({ accepted_payment_methods: methods })
      .eq("id", shop!.id);
    setSaving(false);
    setSuccess(true);
    onSaved();
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-slate-600">Accepted Payment Methods</p>
        <p className="mt-1 text-xs text-slate-400">
          Shown to customers when they choose how to pay — Cash is always
          accepted. This records the customer&apos;s choice only; it
          doesn&apos;t process any payment.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {AVAILABLE_METHODS.map((method) => {
          const isCash = method === "Cash";
          const checked = methods.includes(method);
          return (
            <button
              key={method}
              type="button"
              onClick={() => toggleMethod(method)}
              disabled={isCash}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                checked
                  ? "bg-brand-blue text-white"
                  : "bg-brand-slate text-slate-500 hover:text-slate-900"
              }`}
            >
              {method}
              {isCash && " (always)"}
            </button>
          );
        })}
      </div>

      {success && (
        <p className="rounded-lg border border-brand-emerald/30 bg-brand-emerald/10 px-3.5 py-2.5 text-sm text-brand-emerald">
          Saved.
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-full bg-brand-blue px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
