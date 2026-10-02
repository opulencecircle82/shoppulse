import { supabaseAdmin } from "@/lib/supabase/admin";
import { resend, EMAIL_FROM } from "@/lib/email/resend";
import { formatJobNumber } from "@/lib/jobNumber";

/**
 * Emails every owner of the shop a new booking landed on, alongside the existing in-app bell
 * notification — a shop owner isn't necessarily watching the dashboard the moment a request comes
 * in. Takes only a ticket id (never trusts client-supplied names/numbers for something going out
 * under the shop's own name) and re-reads everything it needs itself with the service role key.
 * Best-effort: a missing API key, a shop with no owner email on file, or a Resend failure all
 * fail quietly here rather than ever blocking or breaking the booking that already succeeded.
 */
export async function POST(request: Request) {
  if (!resend) {
    return Response.json({ skipped: "RESEND_API_KEY not configured" });
  }

  const body = await request.json().catch(() => null);
  const ticketId = body?.ticketId as string | undefined;
  if (!ticketId) {
    return Response.json({ error: "ticketId is required" }, { status: 400 });
  }

  const { data: ticket, error: ticketError } = await supabaseAdmin
    .from("job_tickets")
    .select("shop_id, client_name, client_email, client_phone, service_type, service_address, is_emergency, job_number")
    .eq("id", ticketId)
    .maybeSingle();

  if (ticketError || !ticket) {
    return Response.json({ error: "Job ticket not found" }, { status: 404 });
  }

  const [{ data: shop }, { data: owners }] = await Promise.all([
    supabaseAdmin.from("shops").select("shop_name").eq("id", ticket.shop_id).maybeSingle(),
    supabaseAdmin
      .from("staff_members")
      .select("email, full_name")
      .eq("shop_id", ticket.shop_id)
      .eq("role", "OWNER"),
  ]);

  const recipients = (owners ?? [])
    .map((o) => o.email?.trim())
    .filter((email): email is string => Boolean(email));

  if (recipients.length === 0) {
    return Response.json({ skipped: "No owner email on file for this shop" });
  }

  const jobLabel = formatJobNumber(ticket.job_number, ticketId);
  const shopName = shop?.shop_name ?? "your shop";
  const subject = `${ticket.is_emergency ? "🚨 Emergency " : "New "}booking request from ${ticket.client_name}`;

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: recipients,
      subject,
      text: [
        `${shopName} has a new booking request.`,
        "",
        `Job: ${jobLabel}`,
        `Request: ${ticket.service_type}`,
        `Client name: ${ticket.client_name}`,
        `Contact number: ${ticket.client_phone ?? "Not provided"}`,
        `Address: ${ticket.service_address}`,
        "",
        "Open ShopPulse to review and assign a technician.",
      ].join("\n"),
    });
  } catch (e) {
    // Best-effort — the booking itself already succeeded; a Resend outage shouldn't surface here.
    return Response.json({ error: e instanceof Error ? e.message : "Failed to send email" }, { status: 502 });
  }

  return Response.json({ sent: recipients.length });
}
