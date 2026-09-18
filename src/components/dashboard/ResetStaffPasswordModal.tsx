"use client";

import { useState } from "react";
import { X, KeyRound, Copy, Check } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { StaffMember } from "@/lib/supabase/types";

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export default function ResetStaffPasswordModal({
  staffMember,
  onClose,
}: {
  staffMember: StaffMember;
  onClose: () => void;
}) {
  const [newPassword, setNewPassword] = useState(generatePassword());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedPassword, setSavedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSave() {
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setSaving(false);
      setError("Your session expired. Please log in again.");
      return;
    }

    const response = await fetch(`/api/staff/${staffMember.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ newPassword }),
    });

    setSaving(false);

    if (!response.ok) {
      const result = await response.json();
      setError(result.error ?? "Failed to reset password.");
      return;
    }

    setSavedPassword(newPassword);
  }

  function copyPassword() {
    if (!savedPassword) return;
    navigator.clipboard.writeText(savedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-brand-navy p-6 shadow-2xl ring-1 ring-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-brand-blue" />
            <h2 className="text-sm font-semibold text-white">
              {savedPassword ? "Password reset" : "Reset password"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-1 text-xs text-slate-400">
          For {staffMember.full_name} ({staffMember.username})
        </p>

        {savedPassword ? (
          <>
            <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
              This is the only time you&apos;ll see this password — write it
              down or share it with {staffMember.full_name.split(" ")[0]} now.
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/5 px-3.5 py-2.5">
              <span className="flex-1 truncate font-mono text-sm text-white">
                {savedPassword}
              </span>
              <button
                type="button"
                onClick={copyPassword}
                className="shrink-0 rounded-full border border-white/20 p-1.5 text-slate-300 transition-colors hover:border-brand-blue hover:text-brand-blue"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Done
            </button>
          </>
        ) : (
          <>
            <p className="mt-4 text-xs text-slate-400">
              Passwords can&apos;t be viewed once set — only reset to a new
              one. This one&apos;s pre-filled; you can edit it or generate
              another.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full flex-1 rounded-xl bg-white/5 px-3.5 py-2.5 font-mono text-sm text-white focus:ring-2 focus:ring-brand-blue focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setNewPassword(generatePassword())}
                className="shrink-0 rounded-full border border-white/20 px-3 py-2.5 text-xs font-semibold text-slate-300 transition-colors hover:border-brand-blue hover:text-brand-blue"
              >
                Generate
              </button>
            </div>

            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:border-white/40 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Set Password"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
