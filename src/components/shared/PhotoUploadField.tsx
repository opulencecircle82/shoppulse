"use client";

import { useId, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { uploadCustomerPhoto } from "@/lib/customer/bookings";

export default function PhotoUploadField({
  folder,
  photoUrl,
  onChange,
  label = "Add a photo (optional)",
}: {
  folder: "requests" | "reviews";
  photoUrl: string | null;
  onChange: (url: string | null) => void;
  label?: string;
}) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file || uploading) return;
    // Some mobile browsers leave `file.type` blank (or generic) for a
    // photo taken directly via the camera capture prompt rather than
    // picked from the gallery — falling back to the filename extension
    // catches those instead of rejecting every camera-captured photo.
    const looksLikeImage =
      file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(file.name);
    if (!looksLikeImage) {
      setError("Please choose an image file.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const url = await uploadCustomerPhoto(folder, file);
      onChange(url);
    } catch {
      setError("Upload failed — try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label htmlFor={inputId} className="block text-xs font-medium text-slate-400">
        {label}
      </label>
      {/* A JS-triggered `inputRef.click()` on a hidden file input can lose
          the browser's "user activation" by the time it runs inside some
          Android WebViews, silently failing to open the file/camera picker
          — Chromium logs "File chooser dialog can only be shown with a
          user activation" with no visible error. A real <label for=...>
          triggers the input's native default action directly from the tap
          itself, with no JS in between, so it can't lose activation. */}
      <input
        id={inputId}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
        className="hidden"
      />

      {photoUrl ? (
        <div className="relative mt-1.5 h-32 w-32 overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white"
            aria-label="Remove photo"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={`mt-1.5 flex h-20 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/20 text-sm text-slate-400 hover:border-brand-blue hover:text-brand-blue ${
            uploading ? "pointer-events-none opacity-60" : "cursor-pointer"
          }`}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          {uploading ? "Uploading..." : "Tap to add a photo"}
        </label>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
