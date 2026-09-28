"use client";

import { useState } from "react";
import { BadgeCheck, ChevronDown, MapPin, MessageCircle, Phone, ShieldCheck, UserRound } from "lucide-react";
import type { JobTicket, Shop, StaffMember } from "@/lib/supabase/types";
import { openCustomerChatForEmail, type CustomerChatTarget } from "@/lib/chat/chat";
import { describeJob, firstName, jobLabel, TONE_CLASSES } from "@/lib/dashboard/jobStatus";
import AssignTechSelect from "./AssignTechSelect";
import BookingDecisionButtons from "./BookingDecisionButtons";
import BookingRequestCard from "./BookingRequestCard";
import JobTicketCard from "./JobTicketCard";

/**
 * One job in the owner's master table: who, where, which technician and what
 * they're doing right now, the stage it's at, and the actions. Everything
 * else (payment, invoice, products...) opens under the row with "Manage Job".
 *
 * Laid out with container queries, not screen width, because the room this
 * row gets changes with the live map docked or collapsed. Narrow: stacked.
 * Wide: three aligned columns. It never scrolls sideways.
 */
export default function JobRow({
  ticket,
  staff,
  shop,
  currentStaffId,
  onChanged,
  onOpenInvoice,
  onOpenProofDrawer,
  onMessageCustomer,
}: {
  ticket: JobTicket;
  staff: StaffMember[];
  shop: Shop;
  currentStaffId: string | null;
  onChanged: () => void;
  onOpenInvoice: (ticket: JobTicket) => void;
  onOpenProofDrawer: (ticket: JobTicket) => void;
  onMessageCustomer: (target: CustomerChatTarget) => void;
}) {
  const [managing, setManaging] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const phase = describeJob(ticket);
  const tone = TONE_CLASSES[phase.tone];
  const technician = staff.find((member) => member.id === ticket.assigned_staff_id);
  const cancelled = ticket.status === "CANCELLED";
  const declined = ticket.status === "REJECTED";
  const hasProof = Boolean(ticket.start_photo_url || ticket.end_photo_url);
  const proofIsPrimary = ticket.status === "COMPLETED" || ticket.status === "DISPUTED";
  // A finished job always opens its proof pack — that's where it gets approved —
  // even when the shop lets technicians skip photos and there are none.
  const showProofButton = hasProof || proofIsPrimary;

  async function messageCustomer() {
    setOpeningChat(true);
    setChatError(null);
    try {
      const target = await openCustomerChatForEmail(ticket.client_email);
      if (!target) {
        setChatError("This customer doesn't have a ShopPulse account yet, so there's no chat. Use Call Customer instead.");
        return;
      }
      onMessageCustomer(target);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Couldn't open the chat. Try again.");
    } finally {
      setOpeningChat(false);
    }
  }

  return (
    <li className="relative transition-colors hover:bg-slate-50/50">
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1 ${ticket.is_emergency ? "bg-red-500" : tone.bar}`}
      />

      <div className="grid gap-3 py-4 pl-6 pr-5 @5xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_26rem] @5xl:items-center @5xl:gap-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="min-w-0 text-sm font-semibold text-slate-900">
              <span className="text-slate-500">{jobLabel(ticket)}</span> - {ticket.service_type}
            </p>
            {ticket.is_emergency && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                🚨 EMERGENCY
              </span>
            )}
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-700">
            <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="min-w-0 truncate font-medium">{ticket.client_name}</span>
          </p>
          <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-500">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="min-w-0 break-words">{ticket.service_address}</span>
          </p>
          {cancelled && (
            <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <p>
                <span className="font-semibold text-slate-700">Reason:</span>{" "}
                {ticket.cancellation_reason?.trim() || "No reason was given."}
              </p>
              {ticket.en_route_at && (
                <p className="mt-1 font-medium text-amber-700">The technician had already set off.</p>
              )}
              {ticket.cancellation_fee_applied && (
                <p className="mt-1 font-medium text-amber-700">Call-out fee applies.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
          {ticket.status === "UNASSIGNED" ? (
            <AssignTechSelect
              ticket={ticket}
              staff={staff}
              defaultTasks={shop.default_tasks}
              onAssigned={onChanged}
            />
          ) : ticket.assigned_staff_id && phase.techStatus ? (
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">
              <span className={`h-2 w-2 shrink-0 rounded-full ${tone.bar}`} />
              <span className="truncate">
                {technician ? firstName(technician.full_name) : "Technician"} - {phase.techStatus}
              </span>
            </span>
          ) : cancelled || declined ? (
            technician ? (
              <span className="text-xs text-slate-400">Was assigned to {firstName(technician.full_name)}</span>
            ) : null
          ) : (
            <span className="text-xs text-slate-400">No technician yet</span>
          )}

          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tone.badge}`}>
            {phase.stage}
          </span>
          {phase.gpsVerified && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-emerald-dark">
              <ShieldCheck className="h-3.5 w-3.5" />
              GPS Verified
            </span>
          )}
          {ticket.payment_status === "PAID" &&
            (ticket.status === "IN_PROGRESS" || ticket.status === "COMPLETED" || ticket.status === "APPROVED") && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-emerald-dark">
                <BadgeCheck className="h-3.5 w-3.5" />
                Paid
              </span>
            )}
          {phase.detail && <span className="text-[11px] text-slate-500">{phase.detail}</span>}
        </div>

        <div className="flex flex-wrap items-center gap-2 @5xl:justify-end">
          {ticket.status === "PENDING" && (
            <BookingDecisionButtons ticketId={ticket.id} onChanged={onChanged} />
          )}

          {showProofButton && (
            <button
              type="button"
              onClick={() => onOpenProofDrawer(ticket)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                proofIsPrimary
                  ? "bg-gradient-to-r from-brand-sky to-brand-blue-dark text-white hover:opacity-90"
                  : "border border-slate-300 text-slate-700 hover:border-brand-blue hover:text-brand-blue"
              }`}
            >
              View Proof Pack
            </button>
          )}

          <button
            type="button"
            onClick={() => setManaging((open) => !open)}
            aria-expanded={managing}
            className="inline-flex items-center gap-1 rounded-full border border-brand-blue/40 px-3.5 py-1.5 text-xs font-semibold text-brand-blue transition-colors hover:bg-brand-blue/5"
          >
            Manage Job
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${managing ? "rotate-180" : ""}`} />
          </button>

          <button
            type="button"
            onClick={messageCustomer}
            disabled={openingChat || !ticket.client_email}
            title={ticket.client_email ? undefined : "The customer didn't leave an email"}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-brand-blue hover:text-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {openingChat ? "Opening..." : "Message"}
          </button>

          {ticket.client_phone ? (
            <a
              href={`tel:${ticket.client_phone}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-brand-emerald hover:text-brand-emerald-dark"
            >
              <Phone className="h-3.5 w-3.5" />
              Call Customer
            </a>
          ) : (
            <span
              title="The customer didn't leave a phone number"
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-400"
            >
              <Phone className="h-3.5 w-3.5" />
              Call Customer
            </span>
          )}

          {chatError && (
            <p role="alert" className="basis-full text-xs text-red-600 @5xl:text-right">
              {chatError}
            </p>
          )}
        </div>
      </div>

      {managing && (
        <div className="border-t border-slate-100 bg-slate-50/70 py-4 pl-6 pr-5">
          <div className="max-w-2xl">
            {ticket.status === "PENDING" ? (
              <BookingRequestCard ticket={ticket} shop={shop} onChanged={onChanged} />
            ) : (
              <JobTicketCard
                ticket={ticket}
                staff={staff}
                shop={shop}
                currentStaffId={currentStaffId}
                onChanged={onChanged}
                onOpenInvoice={onOpenInvoice}
              />
            )}
          </div>
        </div>
      )}
    </li>
  );
}
