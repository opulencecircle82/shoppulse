"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type AdminStaffMember = {
  id: string;
  full_name: string;
  email: string;
  role: "OWNER" | "MANAGER" | "TECHNICIAN";
  auth_user_id: string | null;
};

type AdminShop = {
  id: string;
  shop_name: string;
  slug: string;
  currency: string;
  created_at: string;
  is_verified: boolean;
  has_quality_booster: boolean;
  has_marketing_tier: boolean;
  staff_members: AdminStaffMember[];
};

export default function AdminDashboardClient({
  username,
}: {
  username: string;
}) {
  const router = useRouter();
  const [shops, setShops] = useState<AdminShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  async function loadShops() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/shops");
    if (!res.ok) {
      setError("Failed to load accounts.");
      setLoading(false);
      return;
    }
    const body = await res.json();
    setShops(body.shops ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const id = setTimeout(() => {
      loadShops();
    }, 0);
    return () => clearTimeout(id);
  }, []);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/devside");
  }

  async function handleDelete(shop: AdminShop) {
    const confirmed = window.confirm(
      `Delete "${shop.shop_name}" and all of its staff, job tickets, and login accounts? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(shop.id);
    const res = await fetch(`/api/admin/shops/${shop.id}`, {
      method: "DELETE",
    });
    setDeletingId(null);

    if (!res.ok) {
      setError("Failed to delete account.");
      return;
    }

    setShops((prev) => prev.filter((s) => s.id !== shop.id));
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordSaving(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    const res = await fetch("/api/admin/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    setPasswordSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setPasswordError(body.error ?? "Failed to update password.");
      return;
    }

    setPasswordSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
  }

  return (
    <main className="min-h-screen bg-brand-slate">
      <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-slate-400">
              Signed in as <span className="text-white">{username}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowPasswordForm((v) => !v)}
              className="rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-brand-sky hover:text-brand-sky"
            >
              Change Password
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-red-400 hover:text-red-400"
            >
              Log Out
            </button>
          </div>
        </div>

        {showPasswordForm && (
          <form
            onSubmit={handleChangePassword}
            className="mt-6 max-w-sm space-y-4 rounded-2xl border border-slate-700 bg-brand-slate-light/30 p-6"
          >
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-600 bg-brand-slate px-3.5 py-2.5 text-sm text-white focus:border-brand-emerald focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                New Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-600 bg-brand-slate px-3.5 py-2.5 text-sm text-white focus:border-brand-emerald focus:outline-none"
              />
            </div>
            {passwordError && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
                {passwordError}
              </p>
            )}
            {passwordSuccess && (
              <p className="rounded-lg border border-brand-emerald/30 bg-brand-emerald/10 px-3.5 py-2.5 text-sm text-brand-emerald">
                Password updated.
              </p>
            )}
            <button
              type="submit"
              disabled={passwordSaving}
              className="rounded-full bg-brand-emerald px-6 py-2.5 text-sm font-semibold text-brand-slate transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {passwordSaving ? "Saving..." : "Update Password"}
            </button>
          </form>
        )}

        <div className="mt-8">
          {loading && <p className="text-sm text-slate-400">Loading accounts...</p>}
          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}

          {!loading && shops.length === 0 && !error && (
            <p className="text-sm text-slate-400">No accounts yet.</p>
          )}

          <div className="space-y-3">
            {shops.map((shop) => {
              const owner = shop.staff_members.find((m) => m.role === "OWNER");
              return (
                <div
                  key={shop.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-700 bg-brand-slate-light/30 p-5"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">
                        {shop.shop_name}
                      </p>
                      {shop.is_verified && (
                        <span className="rounded-full bg-brand-emerald/15 px-2 py-0.5 text-[10px] font-semibold text-brand-emerald">
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {owner
                        ? `${owner.full_name} · ${owner.email}`
                        : "No owner on record"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {shop.currency} &middot; {shop.staff_members.length} staff
                      &middot; created{" "}
                      {new Date(shop.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(shop)}
                    disabled={deletingId === shop.id}
                    className="rounded-full border border-red-500/40 px-4 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingId === shop.id ? "Deleting..." : "Delete Account"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
