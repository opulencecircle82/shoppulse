import { supabase } from "@/lib/supabase/client";
import type { JobTicket } from "@/lib/supabase/types";
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

export async function submitStartProof(params: {
  ticketId: string;
  photoUrl: string;
  latitude: number;
  longitude: number;
}) {
  const { error } = await supabase
    .from("job_tickets")
    .update({
      status: "IN_PROGRESS",
      start_photo_url: params.photoUrl,
      started_at: new Date().toISOString(),
      start_gps_location: toGeographyPoint(params.latitude, params.longitude),
    })
    .eq("id", params.ticketId);

  if (error) throw error;
}

export async function submitCompletionProof(params: {
  ticketId: string;
  photoUrl: string;
  latitude: number;
  longitude: number;
}) {
  const { error } = await supabase
    .from("job_tickets")
    .update({
      status: "COMPLETED",
      end_photo_url: params.photoUrl,
      completed_at: new Date().toISOString(),
      end_gps_location: toGeographyPoint(params.latitude, params.longitude),
    })
    .eq("id", params.ticketId);

  if (error) throw error;
}
