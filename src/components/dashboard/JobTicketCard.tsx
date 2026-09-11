"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import type { JobTicket, StaffMember } from "@/lib/supabase/types";
import AssignTaskingModal from "./AssignTaskingModal";
import SelectedProductsPicker from "./SelectedProductsPicker";

const PRODUCTS_EDITABLE_STATUSES = new Set(["UNASSIGNED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"]);

export default function JobTicketCard({
  ticket,
  staff,
  defaultTasks,
  shopId,
  currency,
  currentStaffId,
  onChanged,
  onOpenInvoice,
  onOpenProofDrawer,
}: {
  ticket: JobTicket;
  staff: StaffMember[];
  defaultTasks: string[];
  shopId: string;
  currency: string;
  currentStaffId: string | null;
  onChanged: () => void;
  onOpenInvoice: (ticket: JobTicket) => void;
  onOpenProofDrawer?: (ticket: JobTicket) => void;
}) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [pendingAssignee, setPendingAssignee] = useState<StaffMember | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [confirmingPayment, setConfirmingPayment] = useState(false);
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
          className="mt-3 w-full rounded-xl bg-white/5 px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-brand-blue focus:outline-none"
        >
          <option value="">Assign technician...</option>
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
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
          <button
            type="button"
            onClick={() => onOpenInvoice(ticket)}
            className="rounded-full border border-brand-blue/40 px-3 py-1.5 text-xs font-semibold text-brand-blue transition-colors hover:bg-brand-sky/10"
          >
            {ticket.total_invoice_amount > 0 ? "Edit Invoice" : "Generate Invoice"}
          </button>
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
