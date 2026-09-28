import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const maxDuration = 60;

type DuePhoto = { id: string; bucket: string; path: string; sha256: string | null };

/**
 * Daily clean-up (schedule in vercel.json). Photo files that are due to leave the server — see
 * `photos_due_for_purge` — are fingerprinted from the bytes actually stored, deleted from storage, and only then
 * marked as removed in the registry. The photo's address and fingerprint stay in the database, so anyone who
 * saved a copy can still prove it is genuine. Safe to run any number of times: it only ever removes what the
 * database says is due, and a photo whose deletion fails is left for the next run.
 *
 * If a CRON_SECRET is set on the project, Vercel sends it and this route refuses anything else.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Not authorized." }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin.rpc("photos_due_for_purge", { p_limit: 40 });
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const due = (data ?? []) as DuePhoto[];
  let removed = 0;
  let alreadyGone = 0;
  const failed: { id: string; reason: string }[] = [];

  for (const photo of due) {
    const storage = supabaseAdmin.storage.from(photo.bucket);

    const { data: file, error: downloadError } = await storage.download(photo.path);
    let fingerprint: string | null = null;

    if (downloadError) {
      // A file that is already gone (deleted by hand) only needs the registry brought up to date; any other
      // failure is left for tomorrow's run.
      const status = (downloadError as { status?: number }).status;
      if (status !== 400 && status !== 404 && !/not found/i.test(downloadError.message)) {
        failed.push({ id: photo.id, reason: downloadError.message });
        continue;
      }
      alreadyGone += 1;
    } else {
      fingerprint = createHash("sha256").update(Buffer.from(await file.arrayBuffer())).digest("hex");
      const { error: removeError } = await storage.remove([photo.path]);
      if (removeError) {
        failed.push({ id: photo.id, reason: removeError.message });
        continue;
      }
      removed += 1;
    }

    const { error: markError } = await supabaseAdmin.rpc("mark_photo_purged", {
      p_photo_id: photo.id,
      p_sha256: fingerprint,
    });
    if (markError) failed.push({ id: photo.id, reason: markError.message });
  }

  return Response.json({ due: due.length, removed, alreadyGone, failed });
}
