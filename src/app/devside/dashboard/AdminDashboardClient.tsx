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
  const [search, setSearch] = useState("");
  const [viewingShop, setViewingShop] = useState<AdminShop | null>(null);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const filteredShops = shops.filter((shop) =>
    shop.shop_name.toLowerCase().includes(search.trim().toLowerCase())
  );

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
            <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">
              Signed in as <span className="text-slate-900">{username}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowPasswordForm((v) => !v)}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:border-brand-blue hover:text-brand-blue"
            >
              Change Password
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:border-red-400 hover:text-red-400"
            >
              Log Out
            </button>
          </div>
        </div>

        {showPasswordForm && (
          <form
            onSubmit={handleChangePassword}
            className="mt-6 max-w-sm space-y-4 rounded-3xl bg-brand-slate-light/50 p-6 shadow-xl shadow-black/30"
          >
            <div>
              <label className="block text-sm font-medium text-slate-600">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-brand-slate/60 px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">
                New Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-brand-slate/60 px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none"
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
              className="rounded-full bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {passwordSaving ? "Saving..." : "Update Password"}
            </button>
          </form>
        )}

        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              All Registered Shops ({filteredShops.length})
            </h2>
            <input
              type="text"
              placeholder="Search shop name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-xs rounded-xl bg-brand-slate-light/50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm shadow-black/20 focus:ring-2 focus:ring-brand-blue focus:outline-none"
            />
          </div>

          {loading && (
            <p className="mt-4 text-sm text-slate-500">Loading accounts...</p>
          )}
          {error && (
            <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}
          {!loading && filteredShops.length === 0 && !error && (
            <p className="mt-4 text-sm text-slate-500">
              {shops.length === 0 ? "No accounts yet." : "No matches found."}
            </p>
          )}

          {!loading && filteredShops.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-2xl shadow-md shadow-black/20">
              <table className="w-full text-left text-sm">
                <thead className="bg-brand-slate-light/40 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Shop Name</th>
                    <th className="px-4 py-3 font-medium">Owner</th>
                    <th className="px-4 py-3 font-medium">Currency</th>
                    <th className="px-4 py-3 font-medium">Staff</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredShops.map((shop, index) => {
                    const owner = shop.staff_members.find(
                      (m) => m.role === "OWNER"
                    );
                    return (
                      <tr
                        key={shop.id}
                        className="transition-colors hover:bg-brand-slate-light/20"
                      >
                        <td className="px-4 py-3 text-slate-400">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">
                              {shop.shop_name}
                            </span>
                            {shop.is_verified && (
                              <span className="rounded-full bg-brand-emerald/15 px-2 py-0.5 text-[10px] font-semibold text-brand-emerald">
                                Verified
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {owner ? (
                            <>
                              <div>{owner.full_name}</div>
                              <div className="text-xs text-slate-400">
                                {owner.email}
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-400">
                              No owner on record
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {shop.currency}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {shop.staff_members.length}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(shop.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setViewingShop(shop)}
                              className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-900 transition-colors hover:border-brand-blue hover:text-brand-blue"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(shop)}
                              disabled={deletingId === shop.id}
                              className="rounded-full border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingId === shop.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {viewingShop && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6"
          onClick={() => setViewingShop(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl bg-brand-slate p-6 shadow-2xl shadow-black/40"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {viewingShop.shop_name}
                </h3>
                <p className="text-xs text-slate-400">/{viewingShop.slug}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingShop(null)}
                className="text-slate-500 hover:text-slate-900"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Currency</dt>
                <dd className="text-slate-900">{viewingShop.currency}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Verified</dt>
                <dd className="text-slate-900">
                  {viewingShop.is_verified ? "Yes" : "No"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Quality Booster</dt>
                <dd className="text-slate-900">
                  {viewingShop.has_quality_booster ? "Active" : "Not active"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Marketing Suite</dt>
                <dd className="text-slate-900">
                  {viewingShop.has_marketing_tier ? "Active" : "Not active"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Created</dt>
                <dd className="text-slate-900">
                  {new Date(viewingShop.created_at).toLocaleString()}
                </dd>
              </div>
            </dl>

            <div className="mt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Staff ({viewingShop.staff_members.length})
              </p>
              <div className="mt-2 space-y-2">
                {viewingShop.staff_members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-xl bg-brand-slate-light/30 px-3 py-2 text-sm shadow-sm shadow-black/20"
                  >
                    <div>
                      <p className="text-slate-900">{member.full_name}</p>
                      <p className="text-xs text-slate-400">{member.email}</p>
                    </div>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
