import { supabase } from "@/lib/supabase/client";
import { sha256Hex } from "@/lib/tech/photoProof";
import type { JobPhoto } from "@/lib/supabase/types";

/** Must match `photos_due_for_purge` in the database. */
export const PHOTO_RETENTION_DAYS = 60;

/** The registry rows (address code + fingerprint) of one job's photos, oldest first. */
export async function fetchJobPhotos(ticketId: string): Promise<JobPhoto[]> {
  const { data, error } = await supabase
    .from("job_photos")
    .select("id, code, job_ticket_id, kind, sha256, bytes, taken_at, purged_at, sha256_mismatch")
    .eq("job_ticket_id", ticketId)
    .order("taken_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as JobPhoto[];
}

/** Downloads the photo as a file. Falls back to opening it in a new tab when the browser won't let the page save it. */
export async function savePhotoCopy(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) throw new Error("Download failed");
    const objectUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}

export type CopyCheck = "MATCH" | "DIFFERENT" | "NO_FINGERPRINT";

/** Whether a file someone is holding is byte-for-byte the photo that was registered. */
export async function checkPhotoCopy(file: File, photo: Pick<JobPhoto, "sha256">): Promise<CopyCheck> {
  if (!photo.sha256) return "NO_FINGERPRINT";
  return (await sha256Hex(file)) === photo.sha256 ? "MATCH" : "DIFFERENT";
}
