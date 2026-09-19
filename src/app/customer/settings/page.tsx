"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { fetchCurrentCustomer, type Customer } from "@/lib/customer/customerAuth";
import {
  listCustomerAddresses,
  formatAddress,
  setDefaultCustomerAddress,
  deleteCustomerAddress,
  type CustomerAddress,
} from "@/lib/customer/addresses";
import AddressFormModal from "@/components/customer/AddressFormModal";
import { useSmartBack } from "@/lib/hooks/useSmartBack";

export default function CustomerSettingsPage() {
  const router = useRouter();
  const goBack = useSmartBack("/customer");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);

  const load = useCallback(async () => {
    const current = await fetchCurrentCustomer();
    if (!current) {
      router.replace("/customer");
      return;
    }
    setCustomer(current);
    const list = await listCustomerAddresses();
    setAddresses(list);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const id = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(id);
  }, [load]);

  async function handleSetDefault(address: CustomerAddress) {
    setBusyId(address.id);
    setError(null);
    try {
      await setDefaultCustomerAddress(address.id);
      const list = await listCustomerAddresses();
      setAddresses(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update default address.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(address: CustomerAddress) {
    const confirmed = window.confirm(`Remove "${address.label}"?`);
    if (!confirmed) return;

    setBusyId(address.id);
    setError(null);
    try {
      await deleteCustomerAddress(address.id);
      const list = await listCustomerAddresses();
      setAddresses(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove address.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading || !customer) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-navy">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-navy px-5 py-6">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="text-sm font-medium text-slate-400 hover:text-white"
          >
            ← Back
          </button>
        </div>

        <h1 className="mt-3 text-lg font-bold text-white">Settings</h1>
        <p className="mt-1 text-xs text-slate-400">{customer.fullName} · {customer.email}</p>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            My Addresses
          </p>
          <button
            type="button"
            onClick={() => setShowAddAddress(true)}
            className="flex items-center gap-1 text-xs font-semibold text-brand-blue"
          >
            <Plus className="h-3.5 w-3.5" />
            Add New
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Your default address&apos;s pin is what we use to find services and
          technicians near you.
        </p>

        {error && (
          <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="mt-3 space-y-3">
          {addresses.length === 0 && (
            <div className="rounded-2xl bg-white/5 p-6 text-center shadow-md shadow-black/20">
              <MapPin className="mx-auto h-5 w-5 text-slate-400" />
              <p className="mt-2 text-sm text-slate-400">
                No saved addresses yet. Add one so we know where to pin your
                location.
              </p>
            </div>
          )}
          {addresses.map((address) => (
            <div
              key={address.id}
              className="rounded-2xl bg-white/5 p-4 shadow-md shadow-black/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-white">{address.label}</p>
                    {address.isDefault && (
                      <span className="flex items-center gap-1 rounded-full bg-brand-emerald/15 px-2 py-0.5 text-[10px] font-semibold text-brand-emerald">
                        <Star className="h-2.5 w-2.5 fill-brand-emerald" />
                        Default
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-400">
                    {formatAddress(address) || "No location pinned yet"}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {!address.isDefault && (
                  <button
                    type="button"
                    disabled={busyId === address.id}
                    onClick={() => handleSetDefault(address)}
                    className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:border-brand-blue hover:text-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Make Default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditingAddress(address)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:border-brand-blue hover:text-brand-blue"
                >
                  <Pencil className="h-3 w-3" />
                  Edit Pin
                </button>
                <button
                  type="button"
                  disabled={busyId === address.id}
                  onClick={() => handleDelete(address)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:border-red-500 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAddAddress && (
        <AddressFormModal
          customerId={customer.id}
          defaultCountry={customer.country}
          hasExistingAddresses={addresses.length > 0}
          onClose={() => setShowAddAddress(false)}
          onSaved={(address) => {
            setAddresses((prev) =>
              address.isDefault
                ? [address, ...prev.map((a) => ({ ...a, isDefault: false }))]
                : [...prev, address]
            );
            setShowAddAddress(false);
          }}
        />
      )}

      {editingAddress && (
        <AddressFormModal
          customerId={customer.id}
          defaultCountry={customer.country}
          hasExistingAddresses={addresses.length > 0}
          editingAddress={editingAddress}
          onClose={() => setEditingAddress(null)}
          onSaved={(updated) => {
            setAddresses((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
            setEditingAddress(null);
          }}
        />
      )}
    </main>
  );
}
