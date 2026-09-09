"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useShop } from "@/lib/hooks/useShop";
import { useJobTickets } from "@/lib/hooks/useJobTickets";
import { useStaffMembers } from "@/lib/hooks/useStaffMembers";
import { supabase } from "@/lib/supabase/client";
import type { JobTicket } from "@/lib/supabase/types";
import MetricsBar from "@/components/dashboard/MetricsBar";
import KanbanBoard from "@/components/dashboard/KanbanBoard";
import NewJobTicketModal from "@/components/dashboard/NewJobTicketModal";
import InvoiceGeneratorModal from "@/components/dashboard/InvoiceGeneratorModal";
import DisputeModal from "@/components/dashboard/DisputeModal";
import LocalAdManager from "@/components/dashboard/LocalAdManager";

const TABS = [
  { id: "board", label: "Job Board" },
  { id: "ads", label: "Local Ad Network" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function DashboardPage() {
  const router = useRouter();
  const { checked } = useRequireAuth();
  const { loading: shopLoading, shop } = useShop();
  const { tickets, loading: ticketsLoading, refresh: refreshTickets } =
    useJobTickets(shop?.id);
  const { staff, loading: staffLoading } = useStaffMembers(shop?.id);

  const [activeTab, setActiveTab] = useState<TabId>("board");
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [invoiceTicket, setInvoiceTicket] = useState<JobTicket | null>(null);
  const [disputeTicket, setDisputeTicket] = useState<JobTicket | null>(null);

  if (!checked || shopLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-slate">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-emerald border-t-transparent" />
      </main>
    );
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (!shop) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-brand-slate px-6 text-center">
        <span className="rounded-full bg-brand-emerald/15 px-3 py-1 text-xs font-semibold text-brand-emerald">
          You&apos;re in
        </span>
        <h1 className="mt-4 text-3xl font-bold text-white">
          Set up your shop to get started
        </h1>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          Complete your business profile to unlock the job board, invoicing,
          and the local ad network.
        </p>
        <div className="mt-8 flex items-center gap-4">
          <Link
            href="/dashboard/settings"
            className="rounded-full bg-brand-emerald px-6 py-3 text-sm font-semibold text-brand-slate shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-shadow hover:shadow-[0_0_30px_rgba(16,185,129,0.75)]"
          >
            Business Settings
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-full border border-slate-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-brand-sky hover:text-brand-sky"
          >
            Sign Out
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-slate">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{shop.shop_name}</h1>
            <p className="mt-1 text-sm text-slate-400">Owner Command Center</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/settings"
              className="rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-brand-sky hover:text-brand-sky"
            >
              Business Settings
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-red-400 hover:text-red-400"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-brand-emerald/15 text-brand-emerald"
                  : "text-slate-400 hover:bg-brand-slate-light/40 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "board" && (
          <div className="mt-6 space-y-6">
            <MetricsBar tickets={tickets} staff={staff} currency={shop.currency} />

            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Job Tickets
              </h2>
              <button
                type="button"
                onClick={() => setShowNewTicket(true)}
                className="rounded-full bg-brand-emerald px-5 py-2.5 text-sm font-semibold text-brand-slate shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-shadow hover:shadow-[0_0_30px_rgba(16,185,129,0.75)]"
              >
                + New Job Ticket
              </button>
            </div>

            {(ticketsLoading || staffLoading) && (
              <p className="text-sm text-slate-400">Loading job board...</p>
            )}

            {!ticketsLoading && !staffLoading && (
              <KanbanBoard
                tickets={tickets}
                staff={staff}
                onChanged={refreshTickets}
                onOpenInvoice={setInvoiceTicket}
                onOpenDispute={setDisputeTicket}
              />
            )}
          </div>
        )}

        {activeTab === "ads" && (
          <div className="mt-6">
            <LocalAdManager shopId={shop.id} />
          </div>
        )}
      </div>

      {showNewTicket && (
        <NewJobTicketModal
          shopId={shop.id}
          staff={staff}
          onClose={() => setShowNewTicket(false)}
          onCreated={refreshTickets}
        />
      )}

      {invoiceTicket && (
        <InvoiceGeneratorModal
          ticket={invoiceTicket}
          staff={staff}
          currency={shop.currency}
          onClose={() => setInvoiceTicket(null)}
          onSaved={refreshTickets}
        />
      )}

      {disputeTicket && (
        <DisputeModal
          ticket={disputeTicket}
          onClose={() => setDisputeTicket(null)}
          onSaved={refreshTickets}
        />
      )}
    </main>
  );
}
