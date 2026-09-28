import { supabase } from "@/lib/supabase/client";

export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

async function uploadToShopImages(shopId: string, file: File, prefix: string, what: string): Promise<string> {
  const looksLikeImage =
    file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(file.name);
  if (!looksLikeImage) throw new Error("Please upload an image file.");
  if (file.size > MAX_LOGO_BYTES) throw new Error(`${what} must be under 2MB.`);

  const extension = file.name.split(".").pop() ?? "png";
  const path = `${shopId}/${prefix}${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from("shop-logos")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from("shop-logos").getPublicUrl(path);
  return publicUrl;
}

/** Uploads a shop logo and returns its public URL. Throws with a message fit to show the owner. */
export function uploadShopLogo(shopId: string, file: File): Promise<string> {
  return uploadToShopImages(shopId, file, "", "Logo");
}

/** The QR code customers scan to pay the shop directly. */
export function uploadPaymentQr(shopId: string, file: File): Promise<string> {
  return uploadToShopImages(shopId, file, "payment-qr-", "The QR code image");
}
