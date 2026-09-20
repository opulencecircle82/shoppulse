"use client";

import { useState, type FormEvent } from "react";
import { Download } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { JobTicket, Shop, StaffMember } from "@/lib/supabase/types";
import { downloadInvoicePng } from "@/lib/invoice/renderInvoicePng";
import AssignTaskingModal from "./AssignTaskingModal";
import SelectedProductsPicker from "./SelectedProductsPicker";

const PRODUCTS_EDITABLE_STATUSES = new Set(["UNASSIGNED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"]);

export default function JobTicketCard({
  ticket,
  staff,
  defaultTasks,
  shop,
  currentStaffId,
  onChanged,
  onOpenInvoice,
  onOpenProofDrawer,
}: {
  ticket: JobTicket;
  staff: StaffMember[];
  defaultTasks: string[];
  shop: Shop;
  currentStaffId: string | null;
  onChanged: () => void;
  onOpenInvoice: (ticket: JobTicket) => void;
  onOpenProofDrawer?: (ticket: JobTicket) => void;
}) {
  const shopId = shop.id;
  const currency = shop.currency;
  const [linkCopied, setLinkCopied] = useState(false);
  const [pendingAssignee, setPendingAssignee] = useState<StaffMember | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const assignedStaff = staff.find((s) => s.id === ticket.assigned_staff_id);

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
    <div
      onClick={() => onOpenProofDrawer?.(ticket)}
      className={`rounded-2xl bg-white/5 p-4 shadow-md shadow-black/20 ${
        onOpenProofDrawer ? "cursor-pointer transition-shadow hover:shadow-lg hover:shadow-brand-blue/10" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {ticket.client_name}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">{ticket.service_type}</p>
          <p className="mt-1 truncate text-xs text-slate-500">
            {ticket.service_address}
          </p>
        </div>
        {ticket.status === "DISPUTED" && (
          <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
            Disputed
          </span>
        )}
      </div>

      <p className="mt-1.5 text-[10px] text-slate-500">
        {ticket.client_viewed_at
          ? `Client viewed ${new Date(ticket.client_viewed_at).toLocaleDateString()}`
          : "Not yet viewed by client"}
      </p>

      {ticket.status === "UNASSIGNED" ? (
        <select
          value=""
          onChange={(e) => {
            const member = staff.find((s) => s.id === e.target.value);
            if (member) setPendingAssignee(member);
          }}
          onClick={(e) => e.stopPropagation()}
          className="mt-3 w-full rounded-xl bg-white/5 px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-brand-blue focus:outline-none [color-scheme:dark]"
        >
          <option value="" style={{ backgroundColor: "#0F172A", color: "#fff" }}>
            Assign technician...
          </option>
          {staff.map((member) => (
            <option
              key={member.id}
              value={member.id}
              style={{ backgroundColor: "#0F172A", color: "#fff" }}
            >
              {member.full_name}
            </option>
          ))}
        </select>
      ) : (
        <p className="mt-3 text-xs text-slate-400">
          Assigned: <span className="text-white">{assignedStaff?.full_name ?? "—"}</span>
        </p>
      )}

      {ticket.total_invoice_amount > 0 && (
        <p className="mt-1 text-xs font-semibold text-brand-emerald">
          Invoice: {ticket.total_invoice_amount.toFixed(2)}
        </p>
      )}

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

      {(ticket.status === "COMPLETED" || ticket.status === "DISPUTED") && (
        <p className="mt-3 text-xs font-medium text-brand-blue">
          Click card to review proof →
        </p>
      )}

      <div
        className="mt-3 flex flex-wrap gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {ticket.status === "SCHEDULED" && !ticket.staff_accepted_at && (
          <p className="text-xs text-amber-400">
            Waiting for {assignedStaff?.full_name ?? "the technician"} to
            confirm this job.
          </p>
        )}

        {ticket.status === "SCHEDULED" && ticket.staff_accepted_at && (
          <p className="text-xs text-slate-400">
            Confirmed — waiting for {assignedStaff?.full_name ?? "the technician"} to
            start this job from the mobile app.
          </p>
        )}

        {ticket.status === "ESTIMATE_PENDING" && (
          <div className="w-full">
            {ticket.quote_submitted_at ? (
              <>
                <p className="text-xs text-slate-400">
                  Quote sent — waiting for {ticket.client_name} to approve it before{" "}
                  {assignedStaff?.full_name ?? "the technician"} can start the repair.
                </p>
                {ticket.total_invoice_amount > 0 && (
                  <p className="mt-1.5 text-xs font-semibold text-brand-orange">
                    Proposed Total: {currency} {ticket.total_invoice_amount.toFixed(2)}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-400">
                {assignedStaff?.full_name ?? "The technician"} is on site diagnosing the
                issue and preparing a quote.
              </p>
            )}
          </div>
        )}

        {ticket.status === "CANCELLED" && (
          <div className="w-full">
            <p className="text-xs text-slate-400">
              Cancelled by the customer
              {ticket.cancelled_at && ` on ${new Date(ticket.cancelled_at).toLocaleDateString()}`}.
            </p>
            {ticket.cancellation_reason && (
              <p className="mt-1 text-xs text-slate-500">{ticket.cancellation_reason}</p>
            )}
            {ticket.cancellation_fee_applied && (
              <p className="mt-1.5 text-xs font-semibold text-amber-400">
                Call-out fee applies: {currency} {ticket.total_invoice_amount.toFixed(2)}
              </p>
            )}
          </div>
        )}

        {ticket.status === "IN_PROGRESS" && (
          <div className="w-full">
            <p className="text-xs text-slate-400">
              In progress — waiting for {assignedStaff?.full_name ?? "the technician"}{" "}
              to submit completion proof from the mobile app.
            </p>

            {ticket.payment_verified_at ? (
              <p className="mt-2 text-xs font-semibold text-brand-emerald">
                Payment Verified: {currency} {ticket.payment_verified_amount.toFixed(2)}
              </p>
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
                  className="w-28 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-blue focus:outline-none"
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
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowPaymentForm(true)}
                className="mt-2 rounded-full border border-brand-emerald/40 px-3 py-1.5 text-xs font-semibold text-brand-emerald transition-colors hover:bg-brand-emerald/10"
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
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:border-brand-blue hover:text-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
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
                    className="mb-2 flex items-center gap-2 text-xs text-slate-400 hover:text-brand-blue"
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
                  <p className="text-xs font-semibold text-brand-emerald">
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
            className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-brand-blue hover:text-brand-blue"
          >
            {linkCopied ? "Link copied!" : "Copy Client Link"}
          </button>
        )}
      </div>

      {pendingAssignee && (
        <div onClick={(e) => e.stopPropagation()}>
          <AssignTaskingModal
            ticket={ticket}
            staffMember={pendingAssignee}
            defaultTasks={defaultTasks}
            onClose={() => setPendingAssignee(null)}
            onAssigned={() => {
              setPendingAssignee(null);
              onChanged();
            }}
          />
        </div>
      )}
    </div>
  );
}
