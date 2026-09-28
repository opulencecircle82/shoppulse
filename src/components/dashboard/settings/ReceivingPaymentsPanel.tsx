"use client";

import { useEffect, useId, useState, type ChangeEvent, type FormEvent } from "react";
import { ImageUp, Landmark, Loader2, Wallet, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Shop } from "@/lib/supabase/types";
import { uploadPaymentQr } from "@/lib/dashboard/shopLogo";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type BusinessSettingsRow = {
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  paypal_email: string | null;
  payment_qr_url: string | null;
  payment_instructions: string | null;
};

const inputClass =
  "mt-1.5 w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none";

function nullIfBlank(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Where customers send money. Payments go straight to the shop's own bank
 * account, PayPal or QR code — there is no payment gateway in between, so no
 * gateway fees. Customers see these details on their job page once the work
 * is under way, and upload a screenshot as proof; that upload is what tells
 * the technician's app the job is paid.
 */
export default function ReceivingPaymentsPanel({ shop }: { shop: Shop | null }) {
  const [loading, setLoading] = useState(true);
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const qrInputId = useId();
  const shopId = shop?.id;

  useEffect(() => {
    if (!shopId) return;
    let active = true;
    const id = setTimeout(async () => {
      const { data } = await supabase
        .from("business_settings")
        .select(
          "bank_name, bank_account_name, bank_account_number, paypal_email, payment_qr_url, payment_instructions"
        )
        .eq("shop_id", shopId)
        .maybeSingle();
      if (!active) return;
      const row = data as BusinessSettingsRow | null;
      setBankName(row?.bank_name ?? "");
      setAccountName(row?.bank_account_name ?? "");
      setAccountNumber(row?.bank_account_number ?? "");
      setPaypalEmail(row?.paypal_email ?? "");
      setQrUrl(row?.payment_qr_url ?? "");
      setInstructions(row?.payment_instructions ?? "");
      setLoading(false);
    }, 0);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [shopId]);

  if (!shop) {
    return (
      <p className="text-sm text-slate-500">
        Set up your Company Profile first to add your receiving accounts.
      </p>
    );
  }

  async function handleQrFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      setQrUrl(await uploadPaymentQr(shop!.id, file));
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Could not upload the QR code.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (paypalEmail.trim() !== "" && !EMAIL_PATTERN.test(paypalEmail.trim())) {
      setError("That PayPal email doesn't look right — check it and try again.");
      return;
    }

    setSaving(true);
    const { error: saveError } = await supabase.from("business_settings").upsert(
      {
        shop_id: shop!.id,
        bank_name: nullIfBlank(bankName),
        bank_account_name: nullIfBlank(accountName),
        bank_account_number: nullIfBlank(accountNumber),
        paypal_email: nullIfBlank(paypalEmail),
        payment_qr_url: qrUrl || null,
        payment_instructions: nullIfBlank(instructions),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "shop_id" }
    );
    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }
    setSuccess(true);
  }

  if (loading) {
    return <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Receiving Payments</h2>
        <p className="mt-1 text-sm text-slate-500">
          Get paid straight into your own account — no payment-gateway fees. Customers see these
          details on their job page when it&apos;s time to pay, then upload a screenshot as proof.
          The moment they do, your technician&apos;s signature screen unlocks.
        </p>
      </div>

      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Landmark className="h-4 w-4 text-brand-blue" /> Bank Details
        </h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-600">Bank Name</label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. BDO, Chase, Commonwealth Bank"
              maxLength={80}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Account Name</label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Name on the account"
              maxLength={80}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-600">
              Account / Routing Number
            </label>
            <input
              type="text"
              inputMode="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Account number (and routing number, if your bank uses one)"
              maxLength={60}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Wallet className="h-4 w-4 text-brand-blue" /> Digital Payments
        </h3>
        <div className="mt-3 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-600">PayPal Email Address</label>
            <input
              type="email"
              value={paypalEmail}
              onChange={(e) => setPaypalEmail(e.target.value)}
              placeholder="payments@yourshop.com"
              maxLength={120}
              className={inputClass}
            />
          </div>
          <div>
            <p className="block text-sm font-medium text-slate-600">QR Code</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Your GCash, Maya or bank QR — customers scan it to pay.
            </p>
            <input id={qrInputId} type="file" accept="image/*" hidden onChange={handleQrFile} />
            {qrUrl ? (
              <div className="mt-2 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrUrl}
                  alt="Payment QR code"
                  className="h-24 w-24 rounded-xl border border-slate-200 bg-white object-contain p-1"
                />
                <div className="flex flex-col items-start gap-2">
                  <label
                    htmlFor={qrInputId}
                    className="cursor-pointer rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-brand-blue hover:text-brand-blue"
                  >
                    {uploading ? "Uploading..." : "Replace QR"}
                  </label>
                  <button
                    type="button"
                    onClick={() => setQrUrl("")}
                    className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-600"
                  >
                    <X className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <label
                htmlFor={qrInputId}
                className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 transition-colors hover:border-brand-blue hover:text-brand-blue"
              >
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageUp className="h-5 w-5" />}
                {uploading ? "Uploading..." : "Click to upload your QR code"}
              </label>
            )}
            {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-900">Instructions for Customers</h3>
        <textarea
          rows={4}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="e.g. Please upload a screenshot or the reference number after your transfer."
          maxLength={600}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-slate-500">{instructions.length}/600</p>
      </section>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-brand-emerald/30 bg-brand-emerald/10 px-3.5 py-2.5 text-sm text-brand-emerald-dark">
          Saved. Customers will see these details on their next job.
        </p>
      )}

      <button
        type="submit"
        disabled={saving || uploading}
        className="rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save Receiving Details"}
      </button>
    </form>
  );
}
