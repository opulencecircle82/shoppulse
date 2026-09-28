"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { JobTicket } from "@/lib/supabase/types";
import { fetchCurrentCustomer, type Customer } from "@/lib/customer/customerAuth";
import { fetchMyJobs } from "@/lib/customer/bookings";
import { subscribeToJobTickets } from "@/lib/realtime/jobTicketChanges";
import CustomerAuthScreen from "@/components/customer/CustomerAuthScreen";
import CustomerHomeScreen from "@/components/customer/CustomerHomeScreen";

type Screen = "loading" | "auth" | "home";

const JOBS_POLL_MS = 8000;

export default function CustomerAppPage() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [jobs, setJobs] = useState<JobTicket[]>([]);
  const lastJobsRef = useRef("");
  const customerEmail = customer?.email ?? null;

  const resolveSession = useCallback(async () => {
    const current = await fetchCurrentCustomer();
    if (!current) {
      setScreen("auth");
      return;
    }
    setCustomer(current);
    const myJobs = await fetchMyJobs();
    lastJobsRef.current = JSON.stringify(myJobs);
    setJobs(myJobs);
    setScreen("home");
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      resolveSession();
    }, 0);
    return () => clearTimeout(id);
  }, [resolveSession]);

  // The technician's and the shop's updates (on the way, arrived, quote ready...)
  // show up here by themselves, without the customer pulling to refresh.
  useEffect(() => {
    if (screen !== "home") return;
    async function refreshQuietly() {
      if (document.hidden) return;
      try {
        const next = await fetchMyJobs();
        const snapshot = JSON.stringify(next);
        if (snapshot === lastJobsRef.current) return;
        lastJobsRef.current = snapshot;
        setJobs(next);
      } catch {
        // A dropped connection just skips this check; the next one retries.
      }
    }
    const interval = setInterval(refreshQuietly, JOBS_POLL_MS);
    // Instant updates; the poll above is the safety net if the connection drops.
    const stopRealtime = customerEmail
      ? subscribeToJobTickets(`customer-jobs-${customerEmail}`, `client_email=eq.${customerEmail}`, refreshQuietly)
      : () => {};
    const onVisible = () => {
      if (!document.hidden) refreshQuietly();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      stopRealtime();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [screen, customerEmail]);

  if (screen === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-navy">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
      </main>
    );
  }

  if (screen === "auth") {
    return <CustomerAuthScreen onSignedIn={resolveSession} />;
  }

  if (customer) {
    return (
      <CustomerHomeScreen
        customer={customer}
        jobs={jobs}
        onSignedOut={() => {
          setCustomer(null);
          setJobs([]);
          setScreen("auth");
        }}
      />
    );
  }

  return null;
}
