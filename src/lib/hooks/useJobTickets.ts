"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { JobTicket } from "@/lib/supabase/types";

/** How often the list quietly re-checks for changes made elsewhere (a technician's phone, the customer). */
const POLL_MS = 8000;

export function useJobTickets(shopId: string | undefined) {
  const [tickets, setTickets] = useState<JobTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastSnapshotRef = useRef("");

  const fetchTickets = useCallback(async () => {
    if (!shopId) return null;
    return supabase
      .from("job_tickets")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });
  }, [shopId]);

  const refresh = useCallback(async () => {
    if (!shopId) {
      setTickets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await fetchTickets();
    if (!result) return;
    const { data, error: fetchError } = result;

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    const next = (data as JobTicket[]) ?? [];
    lastSnapshotRef.current = JSON.stringify(next);
    setTickets(next);
    setLoading(false);
  }, [shopId, fetchTickets]);

  // Same fetch without the loading flag, and it only touches state when
  // something actually changed — so a technician tapping "On my way" shows up
  // on the owner's board within seconds without the screen flickering or a
  // half-filled form losing its place.
  const refreshQuietly = useCallback(async () => {
    if (!shopId || document.hidden) return;
    try {
      const result = await fetchTickets();
      if (!result || result.error) return;
      const next = (result.data as JobTicket[]) ?? [];
      const snapshot = JSON.stringify(next);
      if (snapshot === lastSnapshotRef.current) return;
      lastSnapshotRef.current = snapshot;
      setTickets(next);
    } catch {
      // A dropped connection just skips this check; the next one retries.
    }
  }, [shopId, fetchTickets]);

  useEffect(() => {
    const id = setTimeout(() => {
      refresh();
    }, 0);
    return () => clearTimeout(id);
  }, [refresh]);

  useEffect(() => {
    if (!shopId) return;
    const interval = setInterval(refreshQuietly, POLL_MS);
    // Catch up right away when the owner comes back to this tab.
    const onVisible = () => {
      if (!document.hidden) refreshQuietly();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [shopId, refreshQuietly]);

  return { tickets, loading, error, refresh };
}
