"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
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
import ProofDisputeDrawer from "@/components/dashboard/ProofDisputeDrawer";
import ProofDisputeGateTab from "@/components/dashboard/ProofDisputeGateTab";
import StaffManagementTab from "@/components/dashboard/StaffManagementTab";
import ServicesTab from "@/components/dashboard/ServicesTab";
import MessagesTab from "@/components/dashboard/MessagesTab";
import PromotionsManager from "@/components/dashboard/PromotionsManager";
import CustomizeMobileAppTab from "@/components/dashboard/CustomizeMobileAppTab";
import ReviewsTab from "@/components/dashboard/ReviewsTab";
import DashboardSidebarNav, {
  DASHBOARD_TABS,
  type DashboardTabId,
} from "@/components/dashboard/DashboardSidebarNav";
import NotificationBell from "@/components/dashboard/NotificationBell";
import CurvedLinesBackground from "@/components/ui/CurvedLinesBackground";
import { listStaffConversations, listShopCustomerConversations } from "@/lib/chat/chat";

const LiveFieldMap = dynamic(
  () => import("@/components/dashboard/LiveFieldMap"),
  { ssr: false, loading: () => <p className="text-sm text-slate-400">Loading map...</p> }
);

export default function DashboardPage() {
  const router = useRouter();
  const { checked } = useRequireAuth();
  const { loading: shopLoading, shop, staffMember, refresh: refreshShop } = useShop();
  const { tickets, loading: ticketsLoading, refresh: refreshTickets } =
    useJobTickets(shop?.id);
  const { staff, loading: staffLoading, refresh: refreshStaff } =
    useStaffMembers(shop?.id);

  const [activeTab, setActiveTab] = useState<DashboardTabId>("board");
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [invoiceTicket, setInvoiceTicket] = useState<JobTicket | null>(null);
  const [proofTicket, setProofTicket] = useState<JobTicket | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!staffMember) return;
    let active = true;

    async function loadUnread() {
      const [staffRows, customerRows] = await Promise.all([
        listStaffConversations(),
        staffMember!.role === "OWNER"
          ? listShopCustomerConversations()
          : Promise.resolve([]),
      ]);
      if (!active) return;
      const total =
        staffRows.reduce((sum, c) => sum + c.unreadCount, 0) +
        customerRows.reduce((sum, c) => sum + c.unreadCount, 0);
      setUnreadMessages(total);
    }

    loadUnread();
    const interval = setInterval(loadUnread, 20000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [staffMember]);

  if (!checked || shopLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-navy">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
      </main>
    );
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (!shop) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-brand-navy px-6 text-center">
        <span className="rounded-full bg-brand-blue/15 px-3 py-1 text-xs font-semibold text-brand-blue">
          You&apos;re in
        </span>
        <h1 className="mt-4 text-3xl font-bold text-white">
          Set up your shop to get started
        </h1>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          Complete your business profile to unlock the job board, invoicing,
          and the local ad network.
        </p>
        <div className="mt-8 flex items-center gap-4">
          <a
            href="/dashboard/settings"
            className="rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
          >
            Business Settings
          </a>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-brand-blue hover:text-brand-blue"
          >
            Sign Out
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-navy">
      <div className="mx-auto max-w-[1600px] px-6 py-10 lg:px-8">
        <div className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-3xl border border-white/10 bg-white/5 px-6 py-6 sm:px-8">
          <CurvedLinesBackground />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-orange/30 bg-orange-500/10 px-3 py-1 text-xs font-medium text-brand-orange">
              Owner Command Center
            </span>
            <h1 className="mt-2 text-2xl font-bold text-white">{shop.shop_name}</h1>
          </div>
          <div className="relative flex items-center gap-3">
            {staffMember && (
              <NotificationBell
                staffId={staffMember.id}
                tickets={tickets}
                onOpenTicket={(ticket) => {
                  if (ticket.status === "COMPLETED" || ticket.status === "DISPUTED") {
                    setProofTicket(ticket);
                  } else {
                    setActiveTab("board");
                  }
                }}
              />
            )}
            <Link
              href="/dashboard/settings"
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/90 transition-colors hover:border-white/40 hover:text-white"
            >
              Business Settings
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/90 transition-colors hover:border-red-400 hover:text-red-300"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
          <DashboardSidebarNav
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            unreadCount={unreadMessages}
          />

          <div className="min-w-0 flex-1">
            <MetricsBar tickets={tickets} staff={staff} currency={shop.currency} />

            <div className="mt-6 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {DASHBOARD_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-brand-blue/15 text-brand-blue"
                      : "text-slate-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {tab.label}
                  {tab.id === "messages" && unreadMessages > 0 && (
                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                  )}
                </button>
              ))}
              <Link
                href="/dashboard/settings"
                className="whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                Business Settings
              </Link>
            </div>

            {activeTab === "board" && (
              <div className="mt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Job Tickets
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowNewTicket(true)}
                    className="rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
                  >
                    + New Job Ticket
                  </button>
                </div>

                {(ticketsLoading || staffLoading) && (
                  <p className="text-sm text-slate-400">Loading job board...</p>
                )}

                {!ticketsLoading && !staffLoading && (
                  <KanbanBoard
                    shop={shop}
                    tickets={tickets}
                    staff={staff}
                    currentStaffId={staffMember?.id ?? null}
                    onChanged={refreshTickets}
                    onOpenInvoice={setInvoiceTicket}
                    onOpenProofDrawer={setProofTicket}
                  />
                )}
              </div>
            )}

            {activeTab === "map" && (
              <div className="mt-6">
                <LiveFieldMap shop={shop} />
              </div>
            )}

            {activeTab === "proof" && (
              <div className="mt-6">
                <ProofDisputeGateTab
                  tickets={tickets}
                  onOpenProofDrawer={setProofTicket}
                />
              </div>
            )}

            {activeTab === "staff" && (
              <div className="mt-6">
                <StaffManagementTab
                  staff={staff}
                  loading={staffLoading}
                  defaultHourlyRate={shop.default_hourly_rate}
                  tickets={tickets}
                  currency={shop.currency}
                  onChanged={refreshStaff}
                />
              </div>
            )}

            {activeTab === "services" && (
              <div className="mt-6">
                <ServicesTab shopId={shop.id} />
              </div>
            )}

            {activeTab === "messages" && staffMember && (
              <div className="mt-6">
                <MessagesTab staffMember={staffMember} staff={staff} />
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="mt-6">
                <ReviewsTab shopId={shop.id} />
              </div>
            )}

            {activeTab === "ads" && (
              <div className="mt-6">
                <PromotionsManager shop={shop} />
              </div>
            )}

            {activeTab === "mobile" && (
              <div className="mt-6">
                <CustomizeMobileAppTab shop={shop} onSaved={refreshShop} />
              </div>
            )}
          </div>
        </div>
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
          currency={shop.currency}
          defaultHourlyRate={shop.default_hourly_rate}
          defaultServiceFee={shop.default_service_fee}
          onClose={() => setInvoiceTicket(null)}
          onSaved={refreshTickets}
        />
      )}

      {proofTicket && (
        <ProofDisputeDrawer
          ticket={proofTicket}
          shop={shop}
          staff={staff}
          onClose={() => setProofTicket(null)}
          onChanged={refreshTickets}
          onApproved={(ticket) => setInvoiceTicket(ticket)}
        />
      )}
    </main>
  );
}
