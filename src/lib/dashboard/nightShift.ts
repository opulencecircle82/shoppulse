import { supabase } from "@/lib/supabase/client";

/** How the night shift answered one after-hours emergency (decided by `get_night_shift_report`). */
export type NightOutcome = "ACCEPTED" | "WAITING" | "MISSED" | "CANCELLED";

export type NightAlerted = { staff_id: string | null; name: string; responded: boolean };

export type NightShiftEntry = {
  jobId: string;
  jobNumber: number | null;
  serviceType: string;
  clientName: string;
  serviceAddress: string;
  createdAt: string;
  status: string;
  outcome: NightOutcome;
  acceptedByName: string | null;
  acceptedAt: string | null;
  alerted: NightAlerted[];
};

type ReportRow = {
  job_id: string;
  job_number: number | null;
  service_type: string;
  client_name: string;
  service_address: string;
  created_at: string;
  status: string;
  outcome: NightOutcome;
  accepted_by_name: string | null;
  accepted_at: string | null;
  alerted: NightAlerted[] | null;
};

/** Every after-hours emergency of the last `days` days, newest first. Owner and managers only. */
export async function fetchNightShiftLog(days = 30): Promise<NightShiftEntry[]> {
  const { data, error } = await supabase.rpc("get_night_shift_report", { p_days: days });
  if (error) throw new Error(error.message);
  return ((data ?? []) as ReportRow[]).map((row) => ({
    jobId: row.job_id,
    jobNumber: row.job_number,
    serviceType: row.service_type,
    clientName: row.client_name,
    serviceAddress: row.service_address,
    createdAt: row.created_at,
    status: row.status,
    outcome: row.outcome,
    acceptedByName: row.accepted_by_name,
    acceptedAt: row.accepted_at,
    alerted: row.alerted ?? [],
  }));
}

export type TechNightStats = {
  /** Emergencies this technician was alerted about. */
  alerts: number;
  accepted: number;
  /** Alerted, and nobody on the night shift took the job. Someone else taking it isn't a miss. */
  missed: number;
};

/** What each technician did with the alerts they got, keyed by staff id. */
export function statsByTechnician(log: NightShiftEntry[]): Map<string, TechNightStats> {
  const stats = new Map<string, TechNightStats>();
  for (const entry of log) {
    for (const alert of entry.alerted) {
      if (!alert.staff_id) continue;
      const current = stats.get(alert.staff_id) ?? { alerts: 0, accepted: 0, missed: 0 };
      current.alerts += 1;
      if (alert.responded) current.accepted += 1;
      else if (entry.outcome === "MISSED") current.missed += 1;
      stats.set(alert.staff_id, current);
    }
  }
  return stats;
}

/** "3 min" / "1 h 5 min" — how long the night shift took to accept. */
export function formatResponseTime(from: string, to: string): string {
  const minutes = Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000));
  if (!Number.isFinite(minutes)) return "";
  if (minutes < 1) return "under a minute";
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}
