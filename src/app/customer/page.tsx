"use client";

import { useCallback, useEffect, useState } from "react";
import type { JobTicket } from "@/lib/supabase/types";
import { fetchCurrentCustomer, type Customer } from "@/lib/customer/customerAuth";
import { fetchMyJobs } from "@/lib/customer/bookings";
import CustomerAuthScreen from "@/components/customer/CustomerAuthScreen";
import CustomerHomeScreen from "@/components/customer/CustomerHomeScreen";

type Screen = "loading" | "auth" | "home";

export default function CustomerAppPage() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [jobs, setJobs] = useState<JobTicket[]>([]);

  const resolveSession = useCallback(async () => {
    const current = await fetchCurrentCustomer();
    if (!current) {
      setScreen("auth");
      return;
    }
    setCustomer(current);
    const myJobs = await fetchMyJobs();
    setJobs(myJobs);
    setScreen("home");
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      resolveSession();
    }, 0);
    return () => clearTimeout(id);
  }, [resolveSession]);

  if (screen === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
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
