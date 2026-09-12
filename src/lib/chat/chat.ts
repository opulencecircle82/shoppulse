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

/** Opens (or creates) the signed-in customer's DM with a shop's owner. */
export async function ensureCustomerConversation(shopSlug: string): Promise<string> {
  const { data, error } = await supabase.rpc("ensure_customer_conversation", {
    p_shop_slug: shopSlug,
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

export type CustomerShopConversation = {
  conversationId: string;
  shopId: string;
  shopName: string;
  shopLogoUrl: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

export async function listCustomerConversations(): Promise<CustomerShopConversation[]> {
  const { data, error } = await supabase.rpc("list_customer_conversations");
  if (error) throw error;
  return ((data ?? []) as {
    conversation_id: string;
    shop_id: string;
    shop_name: string;
    shop_logo_url: string | null;
    last_message_preview: string | null;
    last_message_at: string | null;
    unread_count: number;
  }[]).map((row) => ({
    conversationId: row.conversation_id,
    shopId: row.shop_id,
    shopName: row.shop_name,
    shopLogoUrl: row.shop_logo_url,
    lastMessagePreview: row.last_message_preview,
    lastMessageAt: row.last_message_at,
    unreadCount: Number(row.unread_count),
  }));
}
