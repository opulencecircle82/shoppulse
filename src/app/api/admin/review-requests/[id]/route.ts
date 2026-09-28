import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminSession } from "@/lib/admin/session";

/**
 * The developer console's answer to an owner's request to remove reviews: `approve: true` removes the ticked reviews
 * now (instead of waiting out the 3 days), `approve: false` declines and keeps them. Either way the owner is told.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { approve?: unknown; note?: unknown };
  if (typeof body.approve !== "boolean") {
    return Response.json({ error: "approve must be true or false." }, { status: 400 });
  }
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";

  const { error } = await supabaseAdmin.rpc("admin_decide_review_deletion", {
    p_request_id: id,
    p_approve: body.approve,
    p_note: note || null,
  });

  if (error) {
    // "That request is no longer waiting." is the owner having cancelled it, or it having gone through already.
    return Response.json({ error: error.message }, { status: 409 });
  }

  return Response.json({ ok: true });
}
