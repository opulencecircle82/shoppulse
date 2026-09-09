"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { StaffMember } from "@/lib/supabase/types";

export function useStaffMembers(shopId: string | undefined) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!shopId) {
      setStaff([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from("staff_members")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: true });

    setStaff((data as StaffMember[]) ?? []);
    setLoading(false);
  }, [shopId]);

  useEffect(() => {
    const id = setTimeout(() => {
      refresh();
    }, 0);
    return () => clearTimeout(id);
  }, [refresh]);

  return { staff, loading, refresh };
}
