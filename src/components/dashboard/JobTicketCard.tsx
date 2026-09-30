"use client";

import { useState, type FormEvent } from "react";
import { CalendarDays, Clock, Download, MapPin, Receipt, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { JobTicket, Shop, StaffMember } from "@/lib/supabase/types";
import { downloadInvoicePng } from "@/lib/invoice/renderInvoicePng";
import { formatJobNumber } from "@/lib/jobNumber";
import JobProgress from "./JobProgress";
import { formatPreferred, timeAgo } from "@/lib/dashboard/format";
import SelectedProductsPicker from "./SelectedProductsPicker";
import CancelJobButton from "./CancelJobButton";

const PRODUCTS_EDITABLE_STATUSES = new Set([
  "UNASSIGNED",
  "SCHEDULED",
  "ESTIMATE_PENDING",
  "IN_PROGRESS",
  "COMPLETED",
]);

function stageTimeLabel(ticket: JobTicket): string | null {
  switch (ticket.status) {
    case "UNASSIGNED":
      return `Requested ${timeAgo(ticket.created_at)}`;
    case "SCHEDULED":
      return ticket.staff_accepted_at
        ? `Technician confirmed ${timeAgo(ticket.staff_accepted_at)}`
        : `Requested ${timeAgo(ticket.created_at)}`;
    case "ESTIMATE_PENDING":
      return ticket.started_at ? `On site since ${timeAgo(ticket.started_at)}` : null;
    case "IN_PROGRESS":
      return ticket.started_at ? `Started ${timeAgo(ticket.started_at)}` : null;
    case "COMPLETED":
    case "DISPUTED":
    case "APPROVED":
      return ticket.completed_at ? `Completed ${timeAgo(ticket.completed_at)}` : null;
    case "CANCELLED":
      return ticket.cancelled_at ? `Cancelled ${timeAgo(ticket.cancelled_at)}` : null;
    default:
      return null;
  }
}

/**
 * The details behind a row's "Manage Job" button: progress, contact and
 * payment info, products, and the stage-specific actions (confirm payment,
 * edit invoice, mark paid...). Who the job is for, where it is and what stage
 * it's at already sit on the row itself.
 */
export default function JobTicketCard({
  ticket,
  staff,
  shop,
  currentStaffId,
  onChanged,
  onOpenInvoice,
}: {
  ticket: JobTicket;
  staff: StaffMember[];
  shop: Shop;
  currentStaffId: string | null;
  onChanged: () => void;
  onOpenInvoice: (ticket: JobTicket) => void;
}) {
  const shopId = shop.id;
  const currency = shop.currency;
  const [linkCopied, setLinkCopied] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [rejectingPayment, setRejectingPayment] = useState(false);
  const assignedStaff = staff.find((s) => s.id === ticket.assigned_staff_id);
  const timeInStage = stageTimeLabel(ticket);

  async function handleProductsChange(next: { product_id: string; name: string; price: number; quantity: number }[]) {
    await supabase.from("job_tickets").update({ selected_products: next }).eq("id", ticket.id);
    onChanged();
  }

  async function handleConfirmPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount < 0) return;

    setConfirmingPayment(true);
    await supabase
      .from("job_tickets")
      .update({
        payment_verified_at: new Date().toISOString(),
        payment_verified_amount: amount,
        payment_verified_by: currentStaffId,
      })
      .eq("id", ticket.id);
    setConfirmingPayment(false);
    setShowPaymentForm(false);
    onChanged();
  }

  // A customer's proof of payment unlocks the technician's signature step on its own.
  // If the screenshot turns out to be fake or unreadable, take it back: the job goes
  // unpaid, the signature step locks again, and the customer is asked for a new proof.
  async function handleRejectPayment() {
    const confirmed = window.confirm(
      "Mark this job as unpaid and ask the customer for a new proof of payment? The technician's signature step will lock again."
    );
    if (!confirmed) return;

    setRejectingPayment(true);
    await supabase
      .from("job_tickets")
      .update({
        payment_status: "UNPAID",
        payment_receipt_url: null,
        payment_verified_at: null,
        payment_verified_amount: 0,
        payment_verified_by: null,
        client_payment_confirmed_at: null,
      })
      .eq("id", ticket.id);
    setRejectingPayment(false);
    onChanged();
  }

  function copyClientLink() {
    const link = `${window.location.origin}/client/${ticket.id}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  async function handleDownloadInvoice() {
    setDownloadingInvoice(true);
    try {
      const items = [
        ...(ticket.total_labor_cost > 0
          ? [{ label: `Labor (${ticket.actual_hours}h)`, amount: ticket.total_labor_cost }]
          : []),
        ...ticket.selected_products.map((item) => ({
          label: `${item.name}${item.quantity > 1 ? ` ×${item.quantity}` : ""}`,
          amount: item.price * item.quantity,
        })),
        ...(ticket.service_fee > 0 ? [{ label: "Service Fee", amount: ticket.service_fee }] : []),
      ];
      await downloadInvoicePng(
        {
          shopName: shop.shop_name,
          shopLogoUrl: shop.logo_url,
          shopAddress: shop.address,
          shopContactPhone: shop.contact_phone,
          clientName: ticket.client_name,
          serviceType: ticket.service_type,
          ticketNumber: formatJobNumber(ticket.job_number, ticket.id),
          date: new Date().toLocaleDateString(),
          currency,
          items,
          taxAmount: ticket.tax_amount,
          totalAmount: ticket.total_invoice_amount,
          paymentMethod: ticket.payment_method,
        },
        `invoice-${ticket.client_name.replace(/\s+/g, "-").toLowerCase()}.png`
      );
    } finally {
      setDownloadingInvoice(false);
    }
  }

  async function handleMarkPaid() {
    const confirmed = window.confirm(
      `Mark this job as paid? Confirm you've received ${currency} ${ticket.total_invoice_amount.toFixed(2)} from ${ticket.client_name}.`
    );
    if (!confirmed) return;

    setMarkingPaid(true);
    await supabase
      .from("job_tickets")
      .update({
        invoice_paid_at: new Date().toISOString(),
        invoice_paid_by: currentStaffId,
      })
      .eq("id", ticket.id);
    setMarkingPaid(false);
    onChanged();
  }

  return (
    <div>
      <JobProgress status={ticket.status} />

      <div className="mt-3 space-y-1.5 text-xs text-slate-600">
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="min-w-0 break-words">{ticket.service_address}</span>
        </p>
        {ticket.preferred_date && (
          <p className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            Preferred: {formatPreferred(ticket.preferred_date, ticket.preferred_time)}
          </p>
        )}
        {ticket.status !== "UNASSIGNED" && (
          <p className="flex items-center gap-2">
            <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="text-slate-500">Technician</span>
            <span className="inline-flex items-center rounded-full bg-brand-blue/10 px-2 py-0.5 text-[11px] font-semibold text-brand-blue">
              {assignedStaff?.full_name ?? "Unassigned"}
            </span>
          </p>
        )}
        {timeInStage && (
          <p className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {timeInStage}
          </p>
        )}
      </div>

      {ticket.total_invoice_amount > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-brand-emerald/10 px-3 py-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <Receipt className="h-3.5 w-3.5 text-slate-400" />
            Invoice
          </span>
          <span className="text-sm font-bold text-brand-emerald-dark">
            {currency} {ticket.total_invoice_amount.toFixed(2)}
          </span>
        </div>
      )}

      <p className="mt-2.5 text-[10px] text-slate-400">
        {ticket.client_viewed_at
          ? `Client viewed ${new Date(ticket.client_viewed_at).toLocaleDateString()}`
          : "Not yet viewed by client"}
      </p>

      {PRODUCTS_EDITABLE_STATUSES.has(ticket.status) && (
        <div className="mt-3" onClick={(e) => e.stopPropagation()}>
          <SelectedProductsPicker
            shopId={shopId}
            currency={currency}
            selectedProducts={ticket.selected_products}
            onChange={handleProductsChange}
            label="Products Used"
          />
        </div>
      )}

      <div
        className="mt-3 flex flex-wrap gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {ticket.status === "SCHEDULED" && !ticket.en_route_at && (
          <div className="w-full">
            <p className={ticket.staff_accepted_at ? "text-xs text-slate-500" : "text-xs text-amber-600"}>
              {ticket.staff_accepted_at
                ? `Confirmed — waiting for ${assignedStaff?.full_name ?? "the technician"} to start this job from the mobile app.`
                : `Waiting for ${assignedStaff?.full_name ?? "the technician"} to confirm this job.`}
            </p>
            <div className="mt-2">
              <CancelJobButton ticketId={ticket.id} onChanged={onChanged} />
            </div>
          </div>
        )}

        {ticket.status === "SCHEDULED" && ticket.en_route_at && (
          <p className="text-xs text-slate-500">
            {assignedStaff?.full_name ?? "The technician"} is already on the way — cancellation is no longer available.
          </p>
        )}

        {ticket.status === "ESTIMATE_PENDING" && (
          <div className="w-full">
            {ticket.quote_submitted_at ? (
              <>
                <p className="text-xs text-slate-500">
                  Quote sent — waiting for {ticket.client_name} to approve it before{" "}
                  {assignedStaff?.full_name ?? "the technician"} can start the repair.
                </p>
                {ticket.total_invoice_amount > 0 && (
                  <p className="mt-1.5 text-xs font-semibold text-brand-orange-dark">
                    Proposed Total: {currency} {ticket.total_invoice_amount.toFixed(2)}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-500">
                {assignedStaff?.full_name ?? "The technician"} is on site diagnosing the
                issue and preparing a quote.
              </p>
            )}
          </div>
        )}

        {ticket.status === "CANCELLED" && (
          <div className="w-full">
            <p className="text-xs text-slate-500">
              Cancelled by {ticket.cancelled_by === "SHOP" ? "the shop" : "the customer"}
              {ticket.cancelled_at && ` on ${new Date(ticket.cancelled_at).toLocaleDateString()}`}.
            </p>
            <p className="mt-1 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">Reason:</span>{" "}
              {ticket.cancellation_reason?.trim() || "No reason was given."}
            </p>
          </div>
        )}

        {ticket.status === "IN_PROGRESS" && (
          <div className="w-full">
            <p className="text-xs text-slate-500">
              In progress — waiting for {assignedStaff?.full_name ?? "the technician"}{" "}
              to submit completion proof from the mobile app.
            </p>

            {ticket.client_payment_confirmed_at && ticket.payment_status !== "PAID" && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-emerald/15 px-2.5 py-1 text-[11px] font-semibold text-brand-emerald-dark">
                ✓ Customer confirmed they paid — review and confirm below
              </p>
            )}

            {ticket.payment_receipt_url && (
              <a
                href={ticket.payment_receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center gap-2 text-xs text-slate-500 hover:text-brand-blue"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ticket.payment_receipt_url}
                  alt="Client-uploaded payment receipt"
                  className="h-10 w-10 rounded-lg object-cover"
                />
                Client uploaded a payment receipt
                {ticket.payment_method ? ` (${ticket.payment_method})` : ""} — view full size
              </a>
            )}

            {ticket.payment_status === "PAID" ? (
              <div className="mt-2">
                <p className="text-xs font-semibold text-brand-emerald-dark">
                  ✓ Paid
                  {ticket.payment_verified_amount > 0 &&
                    ` — ${currency} ${ticket.payment_verified_amount.toFixed(2)}`}
                  {!ticket.payment_verified_at && " — the customer's proof was accepted automatically"}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  The technician can now collect the signature and finish the job.
                </p>
                <button
                  type="button"
                  onClick={handleRejectPayment}
                  disabled={rejectingPayment}
                  className="mt-1.5 text-[11px] font-semibold text-red-600 hover:text-red-700 disabled:opacity-60"
                >
                  {rejectingPayment ? "Saving..." : "Proof looks wrong — mark unpaid"}
                </button>
              </div>
            ) : showPaymentForm ? (
              <form onSubmit={handleConfirmPayment} className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  required
                  autoFocus
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={`Amount (${currency})`}
                  className="w-28 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={confirmingPayment}
                  className="rounded-full bg-brand-emerald px-3 py-1.5 text-xs font-semibold text-brand-slate disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {confirmingPayment ? "Saving..." : "Confirm"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentForm(false)}
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPaymentAmount(
                    ticket.total_invoice_amount > 0 ? ticket.total_invoice_amount.toFixed(2) : ""
                  );
                  setShowPaymentForm(true);
                }}
                className="mt-2 rounded-full border border-brand-emerald/40 px-3 py-1.5 text-xs font-semibold text-brand-emerald-dark transition-colors hover:bg-brand-emerald/10"
              >
                Confirm Payment Received
              </button>
            )}
          </div>
        )}

        {ticket.status === "APPROVED" && (
          <div className="w-full">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onOpenInvoice(ticket)}
                className="rounded-full border border-brand-blue/40 px-3 py-1.5 text-xs font-semibold text-brand-blue transition-colors hover:bg-brand-sky/10"
              >
                {ticket.total_invoice_amount > 0 ? "Edit Invoice" : "Generate Invoice"}
              </button>

              {ticket.total_invoice_amount > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadInvoice}
                  disabled={downloadingInvoice}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-900 transition-colors hover:border-brand-blue hover:text-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download className="h-3 w-3" />
                  {downloadingInvoice ? "..." : "Invoice PNG"}
                </button>
              )}
            </div>

            {ticket.total_invoice_amount > 0 && (
              <div className="mt-2">
                {ticket.payment_receipt_url && (
                  <a
                    href={ticket.payment_receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-2 flex items-center gap-2 text-xs text-slate-500 hover:text-brand-blue"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ticket.payment_receipt_url}
                      alt="Client-uploaded payment receipt"
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                    Client uploaded a payment receipt — view full size
                  </a>
                )}

                {ticket.invoice_paid_at ? (
                  <p className="text-xs font-semibold text-brand-emerald-dark">
                    Paid on {new Date(ticket.invoice_paid_at).toLocaleDateString()}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleMarkPaid}
                    disabled={markingPaid}
                    className="rounded-full bg-brand-emerald px-3 py-1.5 text-xs font-semibold text-brand-slate disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {markingPaid ? "Saving..." : "Mark as Paid"}
                  </button>
                )}
              </div>
            )}

            {ticket.warranty_expires_at && (
              <p className="mt-2 text-[11px] text-slate-500">
                {ticket.warranty_claim_of_ticket_id ? "Warranty claim — " : ""}
                Warranty {new Date(ticket.warranty_expires_at) > new Date() ? "active until" : "expired"}{" "}
                {new Date(ticket.warranty_expires_at).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {ticket.status !== "UNASSIGNED" && (
          <button
            type="button"
            onClick={copyClientLink}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-brand-blue hover:text-brand-blue"
          >
            {linkCopied ? "Link copied!" : "Copy Client Link"}
          </button>
        )}
      </div>

    </div>
  );
}
