"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { JobTicket } from "@/lib/supabase/types";

export function useJobTickets(shopId: string | undefined) {
  const [tickets, setTickets] = useState<JobTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!shopId) {
      setTickets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("job_tickets")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setTickets((data as JobTicket[]) ?? []);
    setLoading(false);
  }, [shopId]);

  useEffect(() => {
    const id = setTimeout(() => {
      refresh();
    }, 0);
    return () => clearTimeout(id);
  }, [refresh]);

  return { tickets, loading, error, refresh };
}
