"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Branch } from "@/lib/supabase/types";

export function useBranches(shopId: string | undefined) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!shopId) {
      setBranches([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from("branches")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: true });

    setBranches((data as Branch[]) ?? []);
    setLoading(false);
  }, [shopId]);

  useEffect(() => {
    const id = setTimeout(() => {
      refresh();
    }, 0);
    return () => clearTimeout(id);
  }, [refresh]);

  return { branches, loading, refresh };
}
