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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setShop(null);
      setStaffMember(null);
      setLoading(false);
      return;
    }

    const { data: staffRow, error: staffError } = await supabase
      .from("staff_members")
      .select("*")
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

    setStaffMember(staffRow as StaffMember);

    const { data: shopRow, error: shopError } = await supabase
      .from("shops")
      .select("*")
      .eq("id", staffRow.shop_id)
      .maybeSingle();

    if (shopError) {
      setError(shopError.message);
      setLoading(false);
      return;
    }

    setShop(shopRow as Shop | null);
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
