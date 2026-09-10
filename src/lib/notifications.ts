import { supabase } from "@/lib/supabase/client";

export type AppNotification = {
  id: string;
  shopId: string;
  jobTicketId: string | null;
  type: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
};

function mapRow(row: {
  id: string;
  shop_id: string;
  job_ticket_id: string | null;
  type: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}): AppNotification {
  return {
    id: row.id,
    shopId: row.shop_id,
    jobTicketId: row.job_ticket_id,
    type: row.type,
    title: row.title,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

const SELECT_FIELDS = "id, shop_id, job_ticket_id, type, title, body, read_at, created_at";

export async function fetchStaffNotifications(staffId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select(SELECT_FIELDS)
    .eq("recipient_staff_id", staffId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function fetchCustomerNotifications(customerId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select(SELECT_FIELDS)
    .eq("recipient_customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function markAllNotificationsRead(ids: string[]) {
  if (ids.length === 0) return;
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids)
    .is("read_at", null);
}
