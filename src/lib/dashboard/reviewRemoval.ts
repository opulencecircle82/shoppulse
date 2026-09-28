import { supabase } from "@/lib/supabase/client";
import type { ReviewForModeration, ReviewRemovalRequest } from "@/lib/supabase/types";

/** Must match the default of `review_deletion_requests.delete_after` in the database. */
export const REVIEW_REMOVAL_WAIT_DAYS = 3;

export async function listReviewsForModeration(): Promise<ReviewForModeration[]> {
  const { data, error } = await supabase.rpc("list_reviews_for_moderation");
  if (error) throw new Error(error.message);
  return (data ?? []) as ReviewForModeration[];
}

export async function listReviewRemovalRequests(): Promise<ReviewRemovalRequest[]> {
  const { data, error } = await supabase
    .from("review_deletion_requests")
    .select(
      "id, status, reason, created_at, delete_after, decided_at, decision_note, review_deletion_request_items(id, review_id, rating, comment, client_name, reviewed_at)"
    )
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);
  return (data ?? []) as ReviewRemovalRequest[];
}

export async function requestReviewRemoval(reviewIds: string[], reason: string): Promise<void> {
  const { error } = await supabase.rpc("request_review_deletion", {
    p_review_ids: reviewIds,
    p_reason: reason.trim() || null,
  });
  if (error) throw new Error(error.message);
}

export async function cancelReviewRemoval(requestId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_review_deletion", { p_request_id: requestId });
  if (error) throw new Error(error.message);
}
