"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Shop, StaffMember } from "@/lib/supabase/types";

export function useShop() {
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<Shop | null>(null);
  const [staffMember, setStaffMember] = useState<StaffMember | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    // getSession() reads the already-verified session from local
    // storage/memory (no network round trip), unlike getUser() which
    // re-checks the token against the Auth server every call. Combined
    // with embedding shops(*) in the staff_members query below, this
    // cuts the dashboard's initial load from 3 sequential round trips
    // down to 1.
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const user = session?.user;

    if (!user) {
      setShop(null);
      setStaffMember(null);
      setLoading(false);
      return;
    }

    const { data: staffRow, error: staffError } = await supabase
      .from("staff_members")
      .select("*, shops(*)")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (staffError) {
      setError(staffError.message);
      setLoading(false);
      return;
    }

    if (!staffRow) {
      setStaffMember(null);
      setShop(null);
      setLoading(false);
      return;
    }

    const { shops: shopRow, ...staffFields } = staffRow as StaffMember & {
      shops: Shop | null;
    };

    setStaffMember(staffFields as StaffMember);
    setShop(shopRow);
    setLoading(false);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      refresh();
    }, 0);
    return () => clearTimeout(id);
  }, [refresh]);

  return {
    loading,
    shop,
    staffMember,
    error,
    refresh,
    isOwner: staffMember?.role === "OWNER",
  };
}
