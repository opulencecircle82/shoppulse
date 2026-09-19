export type InvoiceLineItem = {
  label: string;
  amount: number;
};

export type InvoiceData = {
  shopName: string;
  shopLogoUrl: string | null;
  shopAddress: string | null;
  shopContactPhone: string | null;
  clientName: string;
  serviceType: string;
  date: string;
  currency: string;
  items: InvoiceLineItem[];
  taxAmount: number;
  totalAmount: number;
  paymentMethod: string | null;
};

const SCALE = 3;
const WIDTH = 380;
const PADDING = 22;

/** Loads a logo for the canvas without ever tainting it — if the image
 * fails (network error, missing CORS headers, etc.) we just skip drawing
 * it and fall back to an initial-letter badge, rather than let toBlob()
 * throw a SecurityError on an otherwise-fine receipt. */
function loadLogoSafely(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
}

function money(currency: string, amount: number): string {
  return `${currency} ${amount.toFixed(2)}`;
}

/** Renders a small digital receipt as a PNG — deliberately not a PDF, so
 * it can be saved to the phone's gallery and shared as an image straight
 * into Messenger like any other photo. */
export async function renderInvoicePng(data: InvoiceData): Promise<Blob> {
  const logo = data.shopLogoUrl ? await loadLogoSafely(data.shopLogoUrl) : null;

  const itemsHeight = data.items.length * 20;
  const taxRowHeight = data.taxAmount > 0 ? 20 : 0;
  const paymentRowHeight = data.paymentMethod ? 34 : 0;
  const height =
    PADDING + // top
    56 + // logo
    22 + // shop name
    (data.shopAddress ? 16 : 0) +
    (data.shopContactPhone ? 16 : 0) +
    18 + // divider + spacing
    18 + // meta row (date)
    18 + // client row
    10 + // divider spacing
    itemsHeight +
    taxRowHeight +
    12 + // divider spacing
    48 + // total block
    paymentRowHeight +
    28 + // footer
    PADDING;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");
  ctx.scale(SCALE, SCALE);

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, height);

  let y = PADDING;
  const centerX = WIDTH / 2;

  // Logo
  const logoRadius = 26;
  if (logo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, y + logoRadius, logoRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(logo, centerX - logoRadius, y, logoRadius * 2, logoRadius * 2);
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.arc(centerX, y + logoRadius, logoRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#0F172A";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(data.shopName.slice(0, 1).toUpperCase() || "S", centerX, y + logoRadius + 1);
  }
  y += logoRadius * 2 + 12;

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 16px Arial, sans-serif";
  ctx.fillText(truncateToWidth(ctx, data.shopName, WIDTH - PADDING * 2), centerX, y);
  y += 20;

  ctx.fillStyle = "#64748B";
  ctx.font = "10px Arial, sans-serif";
  if (data.shopAddress) {
    ctx.fillText(truncateToWidth(ctx, data.shopAddress, WIDTH - PADDING * 2), centerX, y);
    y += 15;
  }
  if (data.shopContactPhone) {
    ctx.fillText(data.shopContactPhone, centerX, y);
    y += 15;
  }

  y += 6;
  drawDashedLine(ctx, y);
  y += 20;

  // Meta row
  ctx.textAlign = "left";
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 12px Arial, sans-serif";
  ctx.fillText("RECEIPT", PADDING, y);
  ctx.textAlign = "right";
  ctx.fillStyle = "#64748B";
  ctx.font = "10px Arial, sans-serif";
  ctx.fillText(data.date, WIDTH - PADDING, y);
  y += 18;

  // Client row
  ctx.textAlign = "left";
  ctx.fillStyle = "#334155";
  ctx.font = "10px Arial, sans-serif";
  ctx.fillText(
    truncateToWidth(ctx, `${data.clientName} — ${data.serviceType}`, WIDTH - PADDING * 2),
    PADDING,
    y
  );
  y += 16;

  // Items
  ctx.font = "11px Arial, sans-serif";
  for (const item of data.items) {
    ctx.textAlign = "left";
    ctx.fillStyle = "#334155";
    ctx.fillText(truncateToWidth(ctx, item.label, WIDTH - PADDING * 2 - 80), PADDING, y);
    ctx.textAlign = "right";
    ctx.fillStyle = "#0F172A";
    ctx.fillText(money(data.currency, item.amount), WIDTH - PADDING, y);
    y += 20;
  }

  if (data.taxAmount > 0) {
    ctx.textAlign = "left";
    ctx.fillStyle = "#334155";
    ctx.fillText("Tax", PADDING, y);
    ctx.textAlign = "right";
    ctx.fillStyle = "#0F172A";
    ctx.fillText(money(data.currency, data.taxAmount), WIDTH - PADDING, y);
    y += 20;
  }

  y += 2;
  drawDashedLine(ctx, y);
  y += 24;

  // Total block
  ctx.fillStyle = "#F0FDF4";
  ctx.fillRect(PADDING - 10, y - 20, WIDTH - (PADDING - 10) * 2, 36);
  ctx.textAlign = "left";
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 12px Arial, sans-serif";
  ctx.fillText("TOTAL", PADDING, y + 2);
  ctx.textAlign = "right";
  ctx.fillStyle = "#059669";
  ctx.font = "bold 16px Arial, sans-serif";
  ctx.fillText(money(data.currency, data.totalAmount), WIDTH - PADDING, y + 3);
  y += 34;

  if (data.paymentMethod) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#64748B";
    ctx.font = "10px Arial, sans-serif";
    ctx.fillText(`Payment Method: ${data.paymentMethod}`, centerX, y);
    y += 24;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#94A3B8";
  ctx.font = "italic 10px Arial, sans-serif";
  ctx.fillText("Thank you for your business!", centerX, y);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not generate invoice image."));
    }, "image/png");
  });
}

function drawDashedLine(ctx: CanvasRenderingContext2D, y: number) {
  ctx.save();
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(PADDING, y);
  ctx.lineTo(WIDTH - PADDING, y);
  ctx.stroke();
  ctx.restore();
}

/** Renders then triggers a browser download of the invoice PNG.
 *
 * Rendering is async (loading the logo, encoding the canvas), so by the
 * time a blob URL is ready, the click that started this is no longer
 * "fresh" — many mobile browsers (iOS Safari especially, and some Android
 * WebViews) only allow opening a tab or download as a direct, synchronous
 * result of a user gesture, and silently drop it once real work has
 * happened in between. Opening a blank tab synchronously first, then
 * pointing it at the finished image once ready, keeps it inside that
 * original gesture instead of losing it. */
export async function downloadInvoicePng(data: InvoiceData, filename: string) {
  const preOpenedTab = typeof window !== "undefined" ? window.open("", "_blank") : null;

  const blob = await renderInvoicePng(data);
  const url = URL.createObjectURL(blob);

  if (preOpenedTab && !preOpenedTab.closed) {
    preOpenedTab.location.href = url;
    return;
  }

  // Popup blocked (or no window at all) — fall back to a direct download
  // link, which at least works on desktop browsers.
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
