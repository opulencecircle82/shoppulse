// Customer-only chat functions — their own separate Supabase client (lib/supabase/customerClient.ts)
// so a customer's chat session never shares state with an owner/staff session in the same browser.
// Mirrors the generic functions in lib/chat/chat.ts (which stays on the owner/staff client) rather
// than parameterizing them, since ChatThread.tsx needs two genuinely distinct function references
// to pass as props depending on which side is rendering it.
import { customerSupabase } from "@/lib/supabase/customerClient";
import type { ChatMessage } from "@/lib/chat/chat";

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

export async function listConversationMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await customerSupabase
    .from("messages")
    .select(MESSAGE_FIELDS)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapMessage);
}

export async function sendMessage(conversationId: string, body: string): Promise<ChatMessage> {
  const { data, error } = await customerSupabase
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
  await customerSupabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });
}

/** Opens (or creates) the signed-in customer's DM with a shop's owner. */
export async function ensureCustomerConversation(shopSlug: string): Promise<string> {
  const { data, error } = await customerSupabase.rpc("ensure_customer_conversation", {
    p_shop_slug: shopSlug,
  });
  if (error) throw new Error(error.message);
  return data as string;
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
  const { data, error } = await customerSupabase.rpc("list_customer_conversations");
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
