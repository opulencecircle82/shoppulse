"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Shop, JobTicket } from "@/lib/supabase/types";
import { fetchCurrentStaffContext, type StaffContext } from "@/lib/tech/staffContext";
import { fetchAssignedJobs } from "@/lib/tech/jobActions";
import { pickTodayTask, pickJobQueue, computeTechStats, type TechStats } from "@/lib/tech/todayTask";
import { startWatchingLocation } from "@/lib/tech/liveLocation";
import { notifyNativeSignedIn, notifyNativeSignedOut } from "@/lib/tech/nativeBridge";
import TechLoginScreen from "@/components/tech/TechLoginScreen";
import TechHomeScreen from "@/components/tech/TechHomeScreen";
import TechJobScreen from "@/components/tech/TechJobScreen";
import TechMessagesScreen from "@/components/tech/TechMessagesScreen";
import TechRouteScreen from "@/components/tech/TechRouteScreen";
import TechHistoryScreen from "@/components/tech/TechHistoryScreen";
import TechProfileScreen from "@/components/tech/TechProfileScreen";
import TechBottomNav, { type TechTab } from "@/components/tech/TechBottomNav";

type Screen = "loading" | "login" | "tab" | "job" | "messages";

export default function TechAppPage() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [tab, setTab] = useState<TechTab>("jobs");
  const [staffContext, setStaffContext] = useState<StaffContext | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [task, setTask] = useState<JobTicket | null>(null);
  const [queue, setQueue] = useState<JobTicket[]>([]);
  const [allTickets, setAllTickets] = useState<JobTicket[]>([]);
  const [stats, setStats] = useState<TechStats>({ completedToday: 0, completedTotal: 0 });
  const [selectedTicket, setSelectedTicket] = useState<JobTicket | null>(null);

  const loadHome = useCallback(async (context: StaffContext) => {
    const [{ data: shopRow }, tickets] = await Promise.all([
      supabase.from("shops").select("*").eq("id", context.shopId).maybeSingle(),
      fetchAssignedJobs(context.staffId),
    ]);

    const activeTask = pickTodayTask(tickets);
    setShop(shopRow as Shop);
    setTask(activeTask);
    setQueue(pickJobQueue(tickets, activeTask));
    setAllTickets(tickets);
    setStats(computeTechStats(tickets));
    setScreen("tab");
  }, []);

  const resolveSession = useCallback(async () => {
    const context = await fetchCurrentStaffContext();
    if (!context) {
      setScreen("login");
      return;
    }
    setStaffContext(context);
    await loadHome(context);
  }, [loadHome]);

  useEffect(() => {
    const id = setTimeout(() => {
      resolveSession();
    }, 0);
    return () => clearTimeout(id);
  }, [resolveSession]);

  useEffect(() => {
    if (!staffContext) return;
    const stop = startWatchingLocation(staffContext);
    notifyNativeSignedIn(staffContext.locationToken);
    return () => {
      stop();
      notifyNativeSignedOut();
    };
  }, [staffContext]);

  // The home screen's task otherwise only refreshes on sign-in, after
  // submitting a job, or when the technician taps Accept/Decline — so a
  // newly assigned job just sat in the notification bell without ever
  // showing up in "Today's Task" until the technician did something else
  // that happened to reload. Only polls while actually on a main tab,
  // never mid-job, so it can't disturb an in-progress checklist/photo.
  useEffect(() => {
    if (screen !== "tab" || !staffContext) return;
    const interval = setInterval(() => {
      loadHome(staffContext);
    }, 20000);
    return () => clearInterval(interval);
  }, [screen, staffContext, loadHome]);

  function openTask(ticket: JobTicket) {
    setSelectedTicket(ticket);
    setScreen("job");
  }

  function handleSignedOut() {
    setStaffContext(null);
    setShop(null);
    setTask(null);
    setQueue([]);
    setAllTickets([]);
    setStats({ completedToday: 0, completedTotal: 0 });
    setScreen("login");
  }

  if (screen === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-navy">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-orange border-t-transparent" />
      </main>
    );
  }

  if (screen === "login") {
    return <TechLoginScreen onSignedIn={resolveSession} />;
  }

  if (screen === "job" && shop && selectedTicket) {
    return (
      <TechJobScreen
        shop={shop}
        ticket={selectedTicket}
        onBack={() => setScreen("tab")}
        onSubmitted={async () => {
          setScreen("tab");
          if (staffContext) await loadHome(staffContext);
        }}
      />
    );
  }

  if (screen === "messages" && shop) {
    return <TechMessagesScreen shop={shop} onBack={() => setScreen("tab")} />;
  }

  if (screen === "tab" && shop && staffContext) {
    return (
      <>
        {tab === "jobs" && (
          <TechHomeScreen
            shop={shop}
            staffContext={staffContext}
            task={task}
            queue={queue}
            stats={stats}
            onRefresh={() => loadHome(staffContext)}
            onOpenTask={openTask}
            onOpenMessages={() => setScreen("messages")}
            onOpenTicket={(ticketId) => {
              const ticket = allTickets.find((t) => t.id === ticketId);
              if (ticket && (ticket.status === "SCHEDULED" || ticket.status === "IN_PROGRESS")) {
                openTask(ticket);
              }
            }}
          />
        )}
        {tab === "route" && (
          <TechRouteScreen task={task} queue={queue} onOpenTask={openTask} />
        )}
        {tab === "history" && <TechHistoryScreen shop={shop} allTickets={allTickets} />}
        {tab === "profile" && (
          <TechProfileScreen
            shop={shop}
            staffContext={staffContext}
            onSignedOut={handleSignedOut}
          />
        )}
        <TechBottomNav active={tab} onSelect={setTab} />
      </>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-navy">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-orange border-t-transparent" />
    </main>
  );
}
