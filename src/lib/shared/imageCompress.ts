/**
 * Shrinks a photo on the device before it is uploaded: the longest side is capped and the picture is re-encoded as a
 * JPEG, which turns a multi-megabyte camera photo into roughly 100–200 KB — plenty to see the work or read a
 * receipt, and a fraction of the server space. Hands back the original file when the browser can't decode it or
 * when shrinking wouldn't make it any smaller, so an upload never fails because of this step.
 */
export async function compressImage(
  file: File,
  options: { maxEdge: number; quality: number }
): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const ratio = Math.min(1, options.maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.imageSmoothingQuality = "high";
    // A screenshot with transparent areas would turn black as a JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", options.quality)
    );
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}
