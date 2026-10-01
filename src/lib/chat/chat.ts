// Owner/staff (and technician, which is also just a staff_members row) chat functions — the
// owner/staff Supabase client. Customer-side equivalents live in lib/customer/customerChat.ts on
// their own separate client, so the two sides never share a session.
import { supabase } from "@/lib/supabase/client";

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderRole: "owner" | "staff" | "customer";
  body: string;
  createdAt: string;
};

function mapMessage(row: {
  id: string;
  conversation_id: string;
  sender_role: "owner" | "staff" | "customer";
  body: string;
  created_at: string;
}): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderRole: row.sender_role,
    body: row.body,
    createdAt: row.created_at,
  };
}

const MESSAGE_FIELDS = "id, conversation_id, sender_role, body, created_at";

export async function listConversationMessages(
  conversationId: string
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_FIELDS)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapMessage);
}

export async function sendMessage(
  conversationId: string,
  body: string
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .rpc("send_message", { p_conversation_id: conversationId, p_body: body })
    .single();

  if (error) throw new Error(error.message);
  return mapMessage(
    data as {
      id: string;
      conversation_id: string;
      sender_role: "owner" | "staff" | "customer";
      body: string;
      created_at: string;
    }
  );
}

export async function markConversationRead(conversationId: string) {
  await supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });
}

/** Opens (or creates) the owner<->staff DM. Owners pass the target staff
 * member's id; a staff member calls with no argument to reach their own
 * thread with the shop owner. */
export async function ensureStaffConversation(staffMemberId?: string): Promise<string> {
  const { data, error } = await supabase.rpc("ensure_staff_conversation", {
    p_staff_member_id: staffMemberId ?? null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export type StaffConversation = {
  conversationId: string;
  counterpartName: string;
  isOwnerView: boolean;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  staffMemberId: string;
};

export async function listStaffConversations(): Promise<StaffConversation[]> {
  const { data, error } = await supabase.rpc("list_staff_conversations");
  if (error) throw error;
  return ((data ?? []) as {
    conversation_id: string;
    counterpart_name: string;
    is_owner_view: boolean;
    last_message_preview: string | null;
    last_message_at: string | null;
    unread_count: number;
    staff_member_id: string;
  }[]).map((row) => ({
    conversationId: row.conversation_id,
    counterpartName: row.counterpart_name,
    isOwnerView: row.is_owner_view,
    lastMessagePreview: row.last_message_preview,
    lastMessageAt: row.last_message_at,
    unreadCount: Number(row.unread_count),
    staffMemberId: row.staff_member_id,
  }));
}

export type ShopCustomerConversation = {
  conversationId: string;
  customerId: string;
  customerName: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

export async function listShopCustomerConversations(): Promise<ShopCustomerConversation[]> {
  const { data, error } = await supabase.rpc("list_shop_customer_conversations");
  if (error) throw error;
  return ((data ?? []) as {
    conversation_id: string;
    customer_id: string;
    customer_name: string;
    last_message_preview: string | null;
    last_message_at: string | null;
    unread_count: number;
  }[]).map((row) => ({
    conversationId: row.conversation_id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    lastMessagePreview: row.last_message_preview,
    lastMessageAt: row.last_message_at,
    unreadCount: Number(row.unread_count),
  }));
}

export type ShopCustomer = {
  customerId: string;
  fullName: string;
  email: string;
  phone: string | null;
  jobCount: number;
  lastJobAt: string | null;
};

/** Every customer who has ever booked a job with this shop, whether or
 * not they've messaged before — powers the owner's "start a new
 * conversation" picker. */
export async function listShopCustomers(): Promise<ShopCustomer[]> {
  const { data, error } = await supabase.rpc("list_shop_customers");
  if (error) throw error;
  return ((data ?? []) as {
    customer_id: string;
    full_name: string;
    email: string;
    phone: string | null;
    job_count: number;
    last_job_at: string | null;
  }[]).map((row) => ({
    customerId: row.customer_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    jobCount: Number(row.job_count),
    lastJobAt: row.last_job_at,
  }));
}

/** Owner/manager-initiated equivalent of ensureCustomerConversation —
 * only works for a customer who actually has a job with this shop. */
export async function ensureCustomerConversationById(customerId: string): Promise<string> {
  const { data, error } = await supabase.rpc("ensure_customer_conversation_by_id", {
    p_customer_id: customerId,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Which customer chat to open — what the job board hands to the Messages tab. */
export type CustomerChatTarget = {
  conversationId: string;
  customerId: string;
  name: string;
};

/** Opens (or creates) the owner's chat with whoever booked a job. Customers are matched by
 * email, the same way the rest of customer chat does it. Returns null when that person has
 * no ShopPulse account — a job the owner typed in by hand can be for someone who never signed up. */
export async function openCustomerChatForEmail(email: string): Promise<CustomerChatTarget | null> {
  const wanted = email.trim().toLowerCase();
  if (!wanted) return null;
  const customers = await listShopCustomers();
  const match = customers.find((customer) => customer.email.toLowerCase() === wanted);
  if (!match) return null;
  const conversationId = await ensureCustomerConversationById(match.customerId);
  return { conversationId, customerId: match.customerId, name: match.fullName };
}

export type ShopCustomerProfile = {
  fullName: string;
  email: string;
  phone: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  barangay: string | null;
  currency: string;
  jobs: {
    id: string;
    service_type: string;
    status: string;
    created_at: string;
    total_invoice_amount: number;
    effective_amount: number;
    is_estimate: boolean;
  }[];
};

export async function getShopCustomerProfile(customerId: string): Promise<ShopCustomerProfile | null> {
  const { data, error } = await supabase
    .rpc("get_shop_customer_profile", { p_customer_id: customerId })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as {
    full_name: string;
    email: string;
    phone: string | null;
    country: string | null;
    region: string | null;
    city: string | null;
    barangay: string | null;
    currency: string;
    jobs: ShopCustomerProfile["jobs"];
  };
  return {
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    country: row.country,
    region: row.region,
    city: row.city,
    barangay: row.barangay,
    currency: row.currency,
    jobs: row.jobs,
  };
}

// Customer-side conversation functions (ensureCustomerConversation, listCustomerConversations,
// CustomerShopConversation) moved to lib/customer/customerChat.ts, on the customer's own
// separate Supabase client.
