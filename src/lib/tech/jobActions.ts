import { supabase } from "@/lib/supabase/client";
import type { JobTicket } from "@/lib/supabase/types";
import type { SelectedProduct } from "@/components/dashboard/SelectedProductsPicker";
import { toGeographyPoint } from "./gps";

export async function fetchAssignedJobs(staffId: string): Promise<JobTicket[]> {
  const { data, error } = await supabase
    .from("job_tickets")
    .select("*")
    .eq("assigned_staff_id", staffId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as JobTicket[];
}

export async function fetchPaymentVerification(
  ticketId: string
): Promise<{ verifiedAt: string | null; verifiedAmount: number }> {
  const { data, error } = await supabase
    .from("job_tickets")
    .select("payment_verified_at, payment_verified_amount")
    .eq("id", ticketId)
    .single();

  if (error) throw error;
  return {
    verifiedAt: data.payment_verified_at as string | null,
    verifiedAmount: data.payment_verified_amount as number,
  };
}

export async function submitStartProof(params: {
  ticketId: string;
  photoUrl: string;
  latitude: number;
  longitude: number;
}) {
  // Arrival no longer drops straight into IN_PROGRESS — the technician
  // has to diagnose and submit a quote first, which the client must
  // approve before real work (and billable time) begins.
  const { error } = await supabase
    .from("job_tickets")
    .update({
      status: "ESTIMATE_PENDING",
      start_photo_url: params.photoUrl,
      started_at: new Date().toISOString(),
      start_gps_location: toGeographyPoint(params.latitude, params.longitude),
    })
    .eq("id", params.ticketId);

  if (error) throw error;
}

export async function submitEstimate(params: {
  ticketId: string;
  diagnosticFee: number;
  laborFee: number;
  selectedProducts: SelectedProduct[];
}) {
  const productsCost = params.selectedProducts.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const totalInvoiceAmount = params.diagnosticFee + params.laborFee + productsCost;

  const { error } = await supabase
    .from("job_tickets")
    .update({
      service_fee: params.diagnosticFee,
      total_labor_cost: params.laborFee,
      selected_products: params.selectedProducts,
      total_invoice_amount: totalInvoiceAmount,
      quote_submitted_at: new Date().toISOString(),
    })
    .eq("id", params.ticketId);

  if (error) throw error;
}

export async function fetchQuoteApproval(
  ticketId: string
): Promise<{ approvedAt: string | null; status: string }> {
  const { data, error } = await supabase
    .from("job_tickets")
    .select("quote_approved_at, status")
    .eq("id", ticketId)
    .single();

  if (error) throw error;
  return {
    approvedAt: data.quote_approved_at as string | null,
    status: data.status as string,
  };
}

export async function submitCompletionProof(params: {
  ticketId: string;
  photoUrl: string;
  latitude: number;
  longitude: number;
  signatureUrl: string | null;
}) {
  const { error } = await supabase
    .from("job_tickets")
    .update({
      status: "COMPLETED",
      end_photo_url: params.photoUrl,
      completed_at: new Date().toISOString(),
      end_gps_location: toGeographyPoint(params.latitude, params.longitude),
      signature_url: params.signatureUrl,
    })
    .eq("id", params.ticketId);

  if (error) throw error;
}
