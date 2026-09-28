/**
 * Fetches the logo as a bitmap. Returns null when it can't be loaded (offline,
 * or a host that doesn't allow the canvas to use it) so the photo still gets
 * its watermark, just with the name alone.
 */
async function loadLogo(url: string): Promise<ImageBitmap | null> {
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) return null;
    return await createImageBitmap(await response.blob());
  } catch {
    return null;
  }
}

/**
 * Burns the same GPS/timestamp/logo badges shown in the live preview
 * directly into the photo's pixels (not just a CSS overlay on top of
 * it), so the watermark survives once the file leaves this component —
 * onto the owner's dashboard, into a dispute, wherever the URL ends up.
 */
export async function renderWatermarkedPhoto(
  source: File,
  options: {
    shopName: string;
    /** The shop's uploaded logo, drawn beside the name when it can be loaded. */
    logoUrl?: string | null;
    showLogo: boolean;
    showTimestamp: boolean;
    showGps: boolean;
    timestamp: Date;
    latitude: number;
    longitude: number;
  }
): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported on this device.");

  ctx.drawImage(bitmap, 0, 0);

  const scale = Math.max(1, canvas.width / 900);
  const pad = 10 * scale;
  const fontSize = 13 * scale;
  ctx.font = `600 ${fontSize}px sans-serif`;
  ctx.textBaseline = "middle";

  function drawBadge(text: string, x: number, y: number, align: "left" | "right") {
    const textWidth = ctx!.measureText(text).width;
    const boxHeight = fontSize + pad;
    const boxWidth = textWidth + pad * 2;
    const boxX = align === "left" ? x : x - boxWidth;
    ctx!.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx!.beginPath();
    ctx!.roundRect(boxX, y, boxWidth, boxHeight, 6 * scale);
    ctx!.fill();
    ctx!.fillStyle = "#ffffff";
    ctx!.fillText(text, boxX + pad, y + boxHeight / 2);
  }

  if (options.showLogo) {
    const logo = options.logoUrl ? await loadLogo(options.logoUrl) : null;
    if (logo) {
      // Logo and name share one badge.
      const logoSize = fontSize + pad;
      const textWidth = ctx.measureText(options.shopName).width;
      const boxHeight = logoSize + pad;
      const boxWidth = logoSize + textWidth + pad * 3;
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.beginPath();
      ctx.roundRect(pad, pad, boxWidth, boxHeight, 6 * scale);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(pad * 1.5, pad * 1.5, logoSize, logoSize, 4 * scale);
      ctx.clip();
      ctx.drawImage(logo, pad * 1.5, pad * 1.5, logoSize, logoSize);
      ctx.restore();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(options.shopName, pad * 2.5 + logoSize, pad + boxHeight / 2);
      logo.close();
    } else {
      drawBadge(options.shopName, pad, pad, "left");
    }
  }
  if (options.showTimestamp) {
    drawBadge(options.timestamp.toLocaleString(), pad, canvas.height - pad - (fontSize + pad), "left");
  }
  if (options.showGps) {
    drawBadge(
      `${options.latitude.toFixed(5)}°, ${options.longitude.toFixed(5)}°`,
      canvas.width - pad,
      canvas.height - pad - (fontSize + pad),
      "right"
    );
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode photo."))),
      "image/jpeg",
      0.92
    );
  });
}

/** SHA-256 of the exact bytes being uploaded, so a later edit to the
 * stored file can be detected by re-hashing and comparing. */
export async function sha256Hex(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
