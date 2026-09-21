"use client";

import { useRef, useState } from "react";
import { Camera, LogOut, Mail, Phone, Store } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Shop } from "@/lib/supabase/types";
import { uploadStaffAvatar, type StaffContext } from "@/lib/tech/staffContext";

export default function TechProfileScreen({
  shop,
  staffContext,
  onSignedOut,
}: {
  shop: Shop;
  staffContext: StaffContext;
  onSignedOut: () => void;
}) {
  const [avatarUrl, setAvatarUrl] = useState(staffContext.avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSignOut() {
    await supabase.auth.signOut();
    onSignedOut();
  }

  async function handleAvatarFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file.");
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const url = await uploadStaffAvatar(staffContext.staffId, file);
      setAvatarUrl(url);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Could not upload photo.");
    } finally {
      setUploading(false);
    }
  }

  const initial = staffContext.fullName.slice(0, 1).toUpperCase() || "?";

  return (
    <main className="min-h-screen bg-brand-navy px-5 pb-24 pt-6">
      <div className="mx-auto max-w-lg">
        <h1 className="text-lg font-bold text-white">Profile</h1>

        <div className="mt-5 flex flex-col items-center rounded-2xl bg-white/5 p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleAvatarFile(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="relative flex h-16 w-16 items-center justify-center rounded-full bg-brand-orange text-xl font-bold text-white disabled:opacity-60"
            aria-label="Change profile photo"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              initial
            )}
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-blue text-white ring-2 ring-brand-navy">
              <Camera className="h-3 w-3" />
            </span>
          </button>
          {uploadError && <p className="mt-2 text-xs text-red-400">{uploadError}</p>}
          <p className="mt-3 text-lg font-bold text-white">{staffContext.fullName}</p>
          <span className="mt-1 inline-flex rounded-full bg-brand-blue/15 px-2.5 py-1 text-[10px] font-bold text-brand-blue">
            {staffContext.role}
          </span>
        </div>

        <div className="mt-5 space-y-1 rounded-2xl bg-white/5 p-2">
          <div className="flex items-center gap-3 rounded-xl px-3 py-3">
            <Store className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate text-sm text-slate-300">{shop.shop_name}</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl px-3 py-3">
            <Mail className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate text-sm text-slate-300">{staffContext.email}</span>
          </div>
          {staffContext.phone && (
            <div className="flex items-center gap-3 rounded-xl px-3 py-3">
              <Phone className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate text-sm text-slate-300">{staffContext.phone}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-red-500/30 px-6 py-3.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </main>
  );
}
