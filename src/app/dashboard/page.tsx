"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useShop } from "@/lib/hooks/useShop";
import { useJobTickets } from "@/lib/hooks/useJobTickets";
import { useStaffMembers } from "@/lib/hooks/useStaffMembers";
import { supabase } from "@/lib/supabase/client";
import type { JobTicket } from "@/lib/supabase/types";
import DashboardHomeTab from "@/components/dashboard/DashboardHomeTab";
import JobMasterTable from "@/components/dashboard/JobMasterTable";
import { jobFilterOf, type JobFilterId } from "@/lib/dashboard/jobStatus";
import { busyTechnicians } from "@/lib/dashboard/techBusy";
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
import DashboardFooter from "@/components/dashboard/DashboardFooter";
import LiveMapPanel from "@/components/dashboard/LiveMapPanel";
import HelpTip from "@/components/ui/HelpTip";
import DashboardSidebarNav, {
  DASHBOARD_TABS,
  type DashboardTabId,
} from "@/components/dashboard/DashboardSidebarNav";

// Shown once at the top of every tab except Home (which has its own
// welcome header) — title on the left, a one-line explainer on the
// right, so a non-technical owner always knows what a section is for.
// The longer "how does this work" copy lives behind a (?) next to the title
// instead of taking up header space on every visit.
const TAB_HELP: Partial<Record<DashboardTabId, string>> = {
  board:
    "Filter your jobs with the tabs: All Jobs, Pending (new requests, jobs that need a technician, technician not yet confirmed), In Progress (technician preparing, on the way, on site or working), Disputed, Completed and Cancelled (requests a customer cancelled or you declined, with the reason they gave). A red dot on a tab means a job in it is waiting for you. Each row shows the technician's live status — for example \"Juan - En Route\" — and refreshes by itself every few seconds. Use Manage Job for payment, invoice and products.",
};

const TAB_DESCRIPTIONS: Partial<Record<DashboardTabId, string>> = {
  board: "Every job in one list — who's on it, where they are and what stage it's at.",
  proof: "Review photo proof from completed jobs before approving payment.",
  staff: "Add your team, manage their mobile app logins, and see who's active.",
  services: "List what you offer and track the parts and inventory you use.",
  messages: "Chat directly with your staff and customers.",
  reviews: "See what customers are saying about your business.",
  ads: "Create promotions and customize your free business website.",
  mobile: "Personalize how your team's mobile app looks and feels.",
};
import NotificationBell from "@/components/dashboard/NotificationBell";
import GoLiveButton, { hasCompanyProfile, hasWorkingSchedule } from "@/components/dashboard/GoLiveButton";
import BookingAlertHost from "@/components/dashboard/BookingAlertHost";
import CurvedLinesBackground from "@/components/ui/CurvedLinesBackground";
import {
  listStaffConversations,
  listShopCustomerConversations,
  type CustomerChatTarget,
} from "@/lib/chat/chat";
import { playMessageChime } from "@/lib/chat/chime";

const MAP_COLLAPSED_KEY = "shoppulse.dashboard.mapCollapsed";

export default function DashboardPage() {
  const router = useRouter();
  const { checked } = useRequireAuth();
  const { loading: shopLoading, shop, staffMember, isOwner, refresh: refreshShop } = useShop();
  const { tickets, loading: ticketsLoading, refresh: refreshTickets } =
    useJobTickets(shop?.id);
  const { staff, loading: staffLoading, refresh: refreshStaff } =
    useStaffMembers(shop?.id);

  const [activeTab, setActiveTab] = useState<DashboardTabId>("home");
  const [showNewTicket, setShowNewTicket] = useState(false);
  // A chat picked from a job's Message button, waiting for the Messages tab to open it.
  const [chatTarget, setChatTarget] = useState<CustomerChatTarget | null>(null);
  // Which tab of the job board is open. It lives here (not in the board) so a
  // booking popup or a notification can send the owner straight to the right one.
  const [boardFilter, setBoardFilter] = useState<JobFilterId>("ALL");
  const [mapCollapsed, setMapCollapsed] = useState(() => {
    try {
      return typeof window !== "undefined" && window.localStorage.getItem(MAP_COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [invoiceTicket, setInvoiceTicket] = useState<JobTicket | null>(null);
  const [proofTicket, setProofTicket] = useState<JobTicket | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const unreadRef = useRef(0);
  const tabStripRef = useRef<HTMLDivElement>(null);
  // Technicians still working a job can't be handed another one (New Job Ticket's Assign Technician list).
  const busy = useMemo(() => busyTechnicians(tickets), [tickets]);
  const pendingBookingRequests = tickets.filter((t) => t.status === "PENDING").length;
  // Only the very first load hides the board. Later refreshes (after accepting
  // a request, a new booking arriving...) keep it on screen, so the tab the
  // owner is looking at doesn't snap back to the default.
  const boardLoading =
    (ticketsLoading && tickets.length === 0) || (staffLoading && staff.length === 0);

  // The phone tab strip scrolls sideways — keep the open tab centered in view
  // (otherwise tapping "Reviews" could leave it half off-screen).
  useEffect(() => {
    const strip = tabStripRef.current;
    const current = strip?.querySelector<HTMLElement>('[data-active="true"]');
    if (!strip || !current) return;
    strip.scrollTo({
      left: current.offsetLeft - (strip.clientWidth - current.offsetWidth) / 2,
      behavior: "smooth",
    });
  }, [activeTab]);

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
      if (total > unreadRef.current) playMessageChime();
      unreadRef.current = total;
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
      <main className="flex min-h-screen items-center justify-center bg-brand-page">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
      </main>
    );
  }

  function toggleMap() {
    const next = !mapCollapsed;
    setMapCollapsed(next);
    try {
      window.localStorage.setItem(MAP_COLLAPSED_KEY, next ? "1" : "0");
    } catch {
      // Storage unavailable (private mode) — the choice just won't persist.
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  // The job board, invoicing, live map etc. all assume a real address, a map pin and working hours — without
  // them a customer can't find the shop or know when it's open, so the owner can't get past this screen until
  // both are in, however the shop was created (self-signup here, or a bare shop the devside console made for a
  // client). A manager or technician can't fix any of this themselves, so only the owner is held here.
  const setupIncomplete =
    isOwner && shop !== null && (!hasCompanyProfile(shop) || !hasWorkingSchedule(shop));

  if (!shop || setupIncomplete) {
    const missing: string[] = [];
    if (shop && !hasCompanyProfile(shop)) missing.push("your business address and map pin");
    if (shop && !hasWorkingSchedule(shop)) missing.push("your working days and hours");

    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-brand-page px-6 text-center">
        <span className="rounded-full bg-brand-blue/15 px-3 py-1 text-xs font-semibold text-brand-blue">
          You&apos;re in
        </span>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          {shop ? "Finish setting up your shop" : "Set up your shop to get started"}
        </h1>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          {shop
            ? `Please add ${missing.join(" and ")} before using your dashboard — customers and technicians both depend on them.`
            : "Complete your business profile to unlock the job board, invoicing, and the local ad network."}
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
            className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-900 transition-colors hover:border-brand-blue hover:text-brand-blue"
          >
            Sign Out
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-brand-page">
      <div className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-4 sm:px-6 sm:py-10 lg:px-8">
        <div className="relative flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-5 sm:gap-4 sm:px-8 sm:py-6">
          {/* Clipped in its own layer, not on the header itself — the
              header needs to stay overflow-visible so the notification
              dropdown below isn't cut off. */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
            <CurvedLinesBackground />
          </div>
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-orange/30 bg-orange-500/10 px-3 py-1 text-xs font-medium text-brand-orange-dark">
              Owner Command Center
            </span>
            <h1 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">{shop.shop_name}</h1>
            {staffMember?.role === "OWNER" && <GoLiveButton shop={shop} onChanged={() => refreshShop({ quiet: true })} />}
          </div>
          <div className="relative flex items-center gap-2 sm:gap-3">
            {staffMember && (
              <NotificationBell
                staffId={staffMember.id}
                tickets={tickets}
                onOpenTicket={(ticket) => {
                  if (ticket.status === "COMPLETED" || ticket.status === "DISPUTED") {
                    setProofTicket(ticket);
                  } else {
                    setBoardFilter(jobFilterOf(ticket) ?? "ALL");
                    setActiveTab("board");
                  }
                }}
              />
            )}
            <Link
              href="/dashboard/settings"
              className="whitespace-nowrap rounded-full border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900 sm:px-4"
            >
              <span className="sm:hidden">Settings</span>
              <span className="hidden sm:inline">Business Settings</span>
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="whitespace-nowrap rounded-full border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-red-400 hover:text-red-500 sm:px-4"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:flex-wrap xl:flex-nowrap">
          <DashboardSidebarNav
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            unreadCount={unreadMessages}
            bookingRequestCount={pendingBookingRequests}
          />

          {/* Every tab wrapper below opens with mt-6; pull the column up on
              desktop so the first visible block lines up with the sidebar. */}
          <div className="min-w-0 flex-1 lg:-mt-6">
            {/* Phone/tablet tab strip: stays pinned while scrolling so the owner
                can hop between sections without going back to the top. */}
            <div className="sticky top-0 z-30 -mx-4 bg-brand-page/90 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
              <div
                ref={tabStripRef}
                className="relative flex gap-2 overflow-x-auto pb-1 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {DASHBOARD_TABS.map((tab) => {
                  const hasUnread =
                    (tab.id === "messages" && unreadMessages > 0) ||
                    (tab.id === "board" && pendingBookingRequests > 0);
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      data-active={activeTab === tab.id}
                      className={`relative whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? "bg-brand-blue text-white shadow-md shadow-brand-blue/25"
                          : hasUnread
                            ? "bg-red-500/10 text-slate-900"
                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      {tab.label}
                      {hasUnread && (
                        <span className="absolute -right-1 -top-1 flex h-3 w-3">
                          <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-75" />
                          <span className="relative h-3 w-3 rounded-full bg-red-500" />
                        </span>
                      )}
                    </button>
                  );
                })}
                <Link
                  href="/dashboard/settings"
                  className="whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  Business Settings
                </Link>
              </div>
            </div>

            {TAB_DESCRIPTIONS[activeTab] && (
              <div className="mt-6 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <h2 className="text-lg font-bold text-slate-900">
                    {DASHBOARD_TABS.find((tab) => tab.id === activeTab)?.label}
                  </h2>
                  {TAB_HELP[activeTab] && (
                    <HelpTip
                      label={`How ${DASHBOARD_TABS.find((tab) => tab.id === activeTab)?.label} works`}
                    >
                      {TAB_HELP[activeTab]}
                    </HelpTip>
                  )}
                </div>
                <p className="mx-auto mt-1.5 max-w-2xl text-xs leading-relaxed text-slate-500">
                  {TAB_DESCRIPTIONS[activeTab]}
                </p>
              </div>
            )}

            {activeTab === "home" && staffMember && (
              <DashboardHomeTab
                ownerName={staffMember.full_name}
                shop={shop}
                tickets={tickets}
                staff={staff}
                currency={shop.currency}
                onSelectTab={setActiveTab}
              />
            )}

            {activeTab === "board" && (
              <div className="mt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
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

                {boardLoading && <p className="text-sm text-slate-500">Loading job board...</p>}

                {!boardLoading && (
                  <JobMasterTable
                    shop={shop}
                    tickets={tickets}
                    staff={staff}
                    currentStaffId={staffMember?.id ?? null}
                    filter={boardFilter}
                    onFilterChange={setBoardFilter}
                    onChanged={refreshTickets}
                    onOpenInvoice={setInvoiceTicket}
                    onOpenProofDrawer={setProofTicket}
                    onMessageCustomer={(target) => {
                      setChatTarget(target);
                      setActiveTab("messages");
                    }}
                  />
                )}
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
                  unlimitedSeats={shop.unlimited_tech_seats}
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
                <MessagesTab
                  staffMember={staffMember}
                  staff={staff}
                  openThread={chatTarget}
                  onOpenThreadHandled={() => setChatTarget(null)}
                />
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

          {/* The live map stays on the right for every tab. Below xl there is
              no room beside the content, so it drops underneath instead. */}
          <aside
            className={`w-full min-w-0 max-w-full shrink-0 lg:basis-full xl:basis-auto xl:self-start xl:sticky xl:top-6 ${
              mapCollapsed ? "xl:w-14" : "xl:w-[360px] 2xl:w-[420px]"
            }`}
          >
            <LiveMapPanel shop={shop} collapsed={mapCollapsed} onToggle={toggleMap} />
          </aside>
        </div>
      </div>

      <DashboardFooter onSelectTab={setActiveTab} />

      {staffMember && (
        <BookingAlertHost
          staffId={staffMember.id}
          tickets={tickets}
          onNewBooking={refreshTickets}
          onOpenBooking={() => {
            setBoardFilter("PENDING");
            setActiveTab("board");
            refreshTickets();
          }}
        />
      )}

      {showNewTicket && (
        <NewJobTicketModal
          shopId={shop.id}
          staff={staff}
          busyTechnicians={busy}
          onClose={() => setShowNewTicket(false)}
          onCreated={refreshTickets}
        />
      )}

      {invoiceTicket && (
        <InvoiceGeneratorModal
          ticket={invoiceTicket}
          shop={shop}
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
