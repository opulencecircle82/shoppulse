"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import AccountDetailModal from "./AccountDetailModal";

const CURRENCIES = ["USD", "AUD", "GBP", "EUR"];

function AddShopAccountModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [shopName, setShopName] = useState("");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/admin/shops/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopName, ownerFullName, ownerEmail, ownerPassword, currency }),
    });

    const body = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError(body.error ?? "Failed to create account.");
      return;
    }

    setCreated(body.owner);
    onCreated();
  }

  function copyCredentials() {
    if (!created) return;
    navigator.clipboard.writeText(`Email: ${created.email}\nPassword: ${created.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-brand-slate p-6 shadow-2xl shadow-black/40"
      >
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            {created ? "Account Created" : "Add Account"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {created ? (
          <div className="mt-4">
            <p className="text-sm text-slate-600">
              Give these to the owner — this password won&apos;t be shown
              again, so copy it now. No signup or email confirmation needed;
              they can log in with these right away.
            </p>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-brand-slate-light/40 px-4 py-3">
                <p className="text-xs font-medium text-slate-500">Email</p>
                <p className="mt-0.5 font-mono text-sm text-slate-900">
                  {created.email}
                </p>
              </div>
              <div className="rounded-xl bg-brand-slate-light/40 px-4 py-3">
                <p className="text-xs font-medium text-slate-500">Password</p>
                <p className="mt-0.5 font-mono text-sm text-slate-900">
                  {created.password}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={copyCredentials}
              className="mt-4 w-full rounded-full border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:border-brand-blue hover:text-brand-blue"
            >
              {copied ? "Copied!" : "Copy to Clipboard"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500">
                Shop Name
              </label>
              <input
                type="text"
                required
                autoFocus
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="mt-1 w-full rounded-xl bg-brand-slate-light/40 px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">
                Owner Full Name
              </label>
              <input
                type="text"
                required
                value={ownerFullName}
                onChange={(e) => setOwnerFullName(e.target.value)}
                className="mt-1 w-full rounded-xl bg-brand-slate-light/40 px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">
                Owner Email
              </label>
              <input
                type="email"
                required
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                className="mt-1 w-full rounded-xl bg-brand-slate-light/40 px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500">
                  Login Password
                </label>
                <input
                  type="text"
                  required
                  minLength={8}
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-brand-slate-light/40 px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-brand-slate-light/40 px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Creating..." : "Create Account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

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
  unlimited_tech_seats: boolean;
  /** Review-removal requests from this owner that are still waiting. */
  pending_review_requests: number;
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
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [seatsSavingId, setSeatsSavingId] = useState<string | null>(null);
  const [seatsError, setSeatsError] = useState<string | null>(null);

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

  // Unlimited technician seats: a test/demo account that never sees the paid-seat prompts.
  async function handleToggleUnlimitedSeats(shop: AdminShop) {
    setSeatsSavingId(shop.id);
    setSeatsError(null);
    const res = await fetch(`/api/admin/shops/${shop.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unlimitedTechSeats: !shop.unlimited_tech_seats }),
    });
    setSeatsSavingId(null);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setSeatsError(body.error ?? "Could not change the seats.");
      return;
    }

    const updated = { ...shop, unlimited_tech_seats: !shop.unlimited_tech_seats };
    setShops((prev) => prev.map((s) => (s.id === shop.id ? updated : s)));
    setViewingShop(updated);
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
              className="rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
            <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
              <input
                type="text"
                placeholder="Search shop name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full max-w-xs rounded-xl bg-brand-slate-light/50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm shadow-black/20 focus:ring-2 focus:ring-brand-blue focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowAddAccount(true)}
                className="shrink-0 rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
              >
                + Add Account
              </button>
            </div>
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
                            {shop.unlimited_tech_seats && (
                              <span className="rounded-full bg-brand-orange/15 px-2 py-0.5 text-[10px] font-semibold text-brand-orange">
                                Unlimited seats
                              </span>
                            )}
                            {shop.pending_review_requests > 0 && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                {shop.pending_review_requests} review request{shop.pending_review_requests === 1 ? "" : "s"}
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
        <AccountDetailModal
          shop={viewingShop}
          onClose={() => setViewingShop(null)}
          onToggleUnlimitedSeats={() => handleToggleUnlimitedSeats(viewingShop)}
          seatsSaving={seatsSavingId === viewingShop.id}
          seatsError={seatsError}
          onRequestsChanged={loadShops}
        />
      )}

      {showAddAccount && (
        <AddShopAccountModal
          onClose={() => setShowAddAccount(false)}
          onCreated={loadShops}
        />
      )}
    </main>
  );
}
