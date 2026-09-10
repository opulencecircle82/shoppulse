"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchCurrentCustomer, type Customer } from "@/lib/customer/customerAuth";
import {
  fetchShopBySlug,
  submitBooking,
  checkDateAvailability,
  listPublicShopServices,
  type BookingShop,
  type DateAvailability,
  type PublicService,
} from "@/lib/customer/bookings";
import CustomerAuthScreen from "@/components/customer/CustomerAuthScreen";
import AvailabilityCalendar from "@/components/customer/AvailabilityCalendar";
import PhotoUploadField from "@/components/shared/PhotoUploadField";

function customerAddress(customer: Customer): string {
  return [customer.barangay, customer.city, customer.region]
    .filter(Boolean)
    .join(", ");
}

export default function BookJobPage() {
  const params = useParams();
  const router = useRouter();
  const shopSlug = params.shopSlug as string;

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [shop, setShop] = useState<BookingShop | null>(null);
  const [services, setServices] = useState<PublicService[]>([]);
  const [notFound, setNotFound] = useState(false);

  const [serviceType, setServiceType] = useState("");
  const [description, setDescription] = useState("");
  const [requestPhotoUrl, setRequestPhotoUrl] = useState<string | null>(null);
  const [manualAddress, setManualAddress] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [availability, setAvailability] = useState<DateAvailability | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [current, shopRow] = await Promise.all([
      fetchCurrentCustomer(),
      fetchShopBySlug(shopSlug),
    ]);

    if (!shopRow) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setShop(shopRow);
    setCustomer(current);
    setLoading(false);
    listPublicShopServices(shopRow.id).then(setServices).catch(() => {});
  }, [shopSlug]);

  useEffect(() => {
    const id = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(id);
  }, [load]);

  useEffect(() => {
    if (!preferredDate) return;
    let active = true;
    const id = setTimeout(() => {
      setCheckingAvailability(true);
      checkDateAvailability(shopSlug, preferredDate)
        .then((result) => {
          if (active) setAvailability(result);
        })
        .finally(() => {
          if (active) setCheckingAvailability(false);
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [shopSlug, preferredDate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customer) return;

    const serviceAddress = customerAddress(customer) || manualAddress;
    if (!serviceAddress) {
      setError("Please provide your service address.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await submitBooking({
        shopSlug,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone ?? "",
        serviceType,
        serviceAddress,
        preferredDate: preferredDate || null,
        description,
        requestPhotoUrl,
      });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit booking.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
        <p className="text-sm text-slate-500">
          We couldn&apos;t find this business. Double-check the link and try again.
        </p>
      </main>
    );
  }

  if (!customer) {
    return <CustomerAuthScreen onSignedIn={load} />;
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <p className="text-lg font-bold text-slate-900">Request sent!</p>
        <p className="mt-1.5 max-w-xs text-sm text-slate-500">
          {shop?.shop_name} will review your request and assign a technician
          soon.
        </p>
        <button
          type="button"
          onClick={() => router.push("/customer")}
          className="mt-6 rounded-full bg-brand-blue px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/30"
        >
          View My Jobs
        </button>
      </main>
    );
  }

  const knownAddress = customerAddress(customer);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-md">
        <div className="flex items-center gap-3">
          {shop?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shop.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
          )}
          <div>
            <p className="text-lg font-bold text-slate-900">{shop?.shop_name}</p>
            <p className="text-xs text-slate-500">Request a service</p>
          </div>
        </div>

        {shop && (shop.default_hourly_rate > 0 || services.length > 0) && (
          <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm shadow-slate-900/5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Pricing
            </p>
            {shop.default_hourly_rate > 0 && (
              <p className="mt-1.5 text-sm text-slate-700">
                Standard Labor Fee:{" "}
                <span className="font-semibold">
                  {shop.currency} {shop.default_hourly_rate.toFixed(2)}/hr
                </span>
              </p>
            )}
            {services.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-start justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700">{service.name}</p>
                      {service.description && (
                        <p className="text-xs text-slate-400">{service.description}</p>
                      )}
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-slate-900">
                      {shop.currency} {service.price.toFixed(2)}
                      {service.extra_cost > 0 && (
                        <span className="text-xs font-normal text-slate-400">
                          {" "}
                          +{service.extra_cost.toFixed(2)}
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-2xl bg-white p-6 shadow-sm shadow-slate-900/5">
          <div>
            <label className="block text-xs font-medium text-slate-500">
              What do you need done?
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Deep cleaning, AC repair..."
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500">
              Describe the issue (optional)
            </label>
            <textarea
              rows={3}
              placeholder="Explain what's going on so the technician can prepare..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
            />
          </div>

          <PhotoUploadField
            folder="requests"
            photoUrl={requestPhotoUrl}
            onChange={setRequestPhotoUrl}
            label="Photo of the issue (optional)"
          />

          <div>
            <label className="block text-xs font-medium text-slate-500">
              Service Address
            </label>
            {knownAddress ? (
              <p className="mt-1 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700">
                {knownAddress}
              </p>
            ) : (
              <input
                type="text"
                required
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                placeholder="Where should the technician go?"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
              />
            )}
          </div>

          {shop && (
            <div>
              <label className="block text-xs font-medium text-slate-500">
                Preferred Date (optional)
              </label>
              <div className="mt-1">
                <AvailabilityCalendar
                  businessDays={shop.business_days}
                  businessHoursOpen={shop.business_hours_open}
                  businessHoursClose={shop.business_hours_close}
                  selectedDate={preferredDate}
                  onSelect={setPreferredDate}
                />
              </div>
              {checkingAvailability && (
                <p className="mt-1.5 text-xs text-slate-400">Checking availability...</p>
              )}
              {!checkingAvailability && availability && (
                <p
                  className={`mt-1.5 text-xs ${
                    availability.active_staff_count > 0 &&
                    availability.booked_count >= availability.active_staff_count
                      ? "text-amber-600"
                      : "text-emerald-600"
                  }`}
                >
                  {availability.active_staff_count > 0 &&
                  availability.booked_count >= availability.active_staff_count
                    ? "This day looks fully booked — the business may still fit you in."
                    : "Looks available on this day."}
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-slate-400">
            We&apos;ll contact you at {customer.email}
            {customer.phone ? ` or ${customer.phone}` : ""}.
          </p>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-brand-blue px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Sending..." : "Send Request"}
          </button>
        </form>
      </div>
    </main>
  );
}
