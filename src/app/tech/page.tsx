"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Shop, JobTicket } from "@/lib/supabase/types";
import { fetchCurrentStaffContext, type StaffContext } from "@/lib/tech/staffContext";
import { fetchAssignedJobs } from "@/lib/tech/jobActions";
import { pickTodayTask } from "@/lib/tech/todayTask";
import { startWatchingLocation } from "@/lib/tech/liveLocation";
import { notifyNativeSignedIn, notifyNativeSignedOut } from "@/lib/tech/nativeBridge";
import TechLoginScreen from "@/components/tech/TechLoginScreen";
import TechHomeScreen from "@/components/tech/TechHomeScreen";
import TechJobScreen from "@/components/tech/TechJobScreen";

type Screen = "loading" | "login" | "home" | "job";

export default function TechAppPage() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [staffContext, setStaffContext] = useState<StaffContext | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [task, setTask] = useState<JobTicket | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<JobTicket | null>(null);

  const loadHome = useCallback(async (context: StaffContext) => {
    const [{ data: shopRow }, tickets] = await Promise.all([
      supabase.from("shops").select("*").eq("id", context.shopId).maybeSingle(),
      fetchAssignedJobs(context.staffId),
    ]);

    setShop(shopRow as Shop);
    setTask(pickTodayTask(tickets));
    setScreen("home");
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
        onBack={() => setScreen("home")}
        onSubmitted={async () => {
          setScreen("home");
          if (staffContext) await loadHome(staffContext);
        }}
      />
    );
  }

  if (screen === "home" && shop) {
    return (
      <TechHomeScreen
        shop={shop}
        task={task}
        onOpenTask={(ticket) => {
          setSelectedTicket(ticket);
          setScreen("job");
        }}
        onSignedOut={() => {
          setStaffContext(null);
          setShop(null);
          setTask(null);
          setScreen("login");
        }}
      />
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-navy">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-orange border-t-transparent" />
    </main>
  );
}
