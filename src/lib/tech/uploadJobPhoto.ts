import { supabase } from "@/lib/supabase/client";

export async function uploadJobPhoto(
  shopId: string,
  ticketId: string,
  file: File
): Promise<string> {
  const extension = file.name.split(".").pop() ?? "jpg";
  const path = `${shopId}/${ticketId}/${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from("job-photos")
    .upload(path, file, { contentType: file.type });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from("job-photos").getPublicUrl(path);

  return publicUrl;
}

export async function uploadSignature(
  shopId: string,
  ticketId: string,
  dataUrl: string
): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const path = `${shopId}/${ticketId}/signature-${Date.now()}.png`;

  const { error } = await supabase.storage
    .from("job-photos")
    .upload(path, blob, { contentType: "image/png" });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from("job-photos").getPublicUrl(path);

  return publicUrl;
}
