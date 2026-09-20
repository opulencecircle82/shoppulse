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
    drawBadge(options.shopName, pad, pad, "left");
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
