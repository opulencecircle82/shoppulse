"use client";

import { useState } from "react";
import { Check, Copy, Landmark, Wallet } from "lucide-react";
import type { TicketPaymentInfo } from "@/lib/customer/bookings";

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="break-words text-sm font-medium text-white">{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label}`}
        className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-white/10 px-3 text-[11px] font-semibold text-slate-300 transition-colors hover:text-white"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

/**
 * How to pay this shop directly, filtered down to whichever payment method the customer actually
 * picked — showing every method at once regardless of their choice was confusing when a shop had
 * both bank and PayPal filled in. Cash and Credit/Debit Card are paid to the technician in person,
 * so neither has anything to show here. Renders nothing if the shop hasn't filled in the relevant
 * details, so the job page falls back to its plain "pay the technician or shop directly" line.
 */
export default function PaymentDetails({
  info,
  method,
}: {
  info: TicketPaymentInfo | null;
  method: string | null;
}) {
  if (!info || !method || method === "Cash") return null;

  const hasBank = Boolean(info.bank_name || info.bank_account_name || info.bank_account_number);
  const showBank = method === "Bank Transfer" && hasBank;
  const showPaypal = method === "PayPal" && Boolean(info.paypal_email);
  const showQr = (method === "Bank Transfer" || method === "PayPal") && Boolean(info.payment_qr_url);
  const showInstructions = Boolean(info.payment_instructions);

  if (!showBank && !showPaypal && !showQr && !showInstructions) return null;

  return (
    <div className="mt-4 rounded-2xl bg-white/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-orange">
        Pay this shop directly
      </p>

      {showBank && (
        <div className="mt-2 divide-y divide-white/10">
          <p className="flex items-center gap-1.5 pb-1 text-xs font-semibold text-slate-300">
            <Landmark className="h-3.5 w-3.5" /> Bank transfer
          </p>
          {info.bank_name && <CopyRow label="Bank" value={info.bank_name} />}
          {info.bank_account_name && <CopyRow label="Account name" value={info.bank_account_name} />}
          {info.bank_account_number && (
            <CopyRow label="Account / routing number" value={info.bank_account_number} />
          )}
        </div>
      )}

      {showPaypal && (
        <div className="mt-3 divide-y divide-white/10">
          <p className="flex items-center gap-1.5 pb-1 text-xs font-semibold text-slate-300">
            <Wallet className="h-3.5 w-3.5" /> PayPal
          </p>
          <CopyRow label="PayPal email" value={info.paypal_email!} />
        </div>
      )}

      {showQr && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-300">Scan to pay</p>
          <a href={info.payment_qr_url!} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={info.payment_qr_url!}
              alt="Payment QR code"
              className="mt-2 h-40 w-40 rounded-xl bg-white object-contain p-2"
            />
          </a>
        </div>
      )}

      {showInstructions && (
        <p className="mt-3 whitespace-pre-wrap rounded-xl bg-black/20 px-3 py-2.5 text-xs leading-relaxed text-slate-300">
          {info.payment_instructions}
        </p>
      )}
    </div>
  );
}
