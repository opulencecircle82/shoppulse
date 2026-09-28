"use client";

import { Suspense, useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { MapPin, Plus } from "lucide-react";
import { fetchCurrentCustomer, type Customer } from "@/lib/customer/customerAuth";
import {
  listCustomerAddresses,
  formatAddress,
  type CustomerAddress,
} from "@/lib/customer/addresses";
import {
  fetchShopBySlug,
  submitBooking,
  checkDateAvailability,
  isShopOpenNow,
  listPublicShopServices,
  type BookingShop,
  type DateAvailability,
  type PublicService,
} from "@/lib/customer/bookings";
import CustomerAuthScreen from "@/components/customer/CustomerAuthScreen";
import AvailabilityCalendar from "@/components/customer/AvailabilityCalendar";
import TimeSlotPicker from "@/components/customer/TimeSlotPicker";
import {
  formatDayLong,
  formatTimeOfDay,
  nextOpenDay,
  toIsoDate,
} from "@/lib/customer/slots";
import PhotoUploadField from "@/components/shared/PhotoUploadField";
import AddressFormModal from "@/components/customer/AddressFormModal";
import { useSmartBack } from "@/lib/hooks/useSmartBack";
import { ensureCustomerConversation } from "@/lib/chat/chat";

export default function BookJobPage() {
  return (
    <Suspense fallback={null}>
      <BookJobPageContent />
    </Suspense>
  );
}

function BookJobPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const goBack = useSmartBack("/customer");
  const shopSlug = params.shopSlug as string;
  const promotionId = searchParams.get("promo");
  // Arrived from "Click to schedule your request for tomorrow" on a business that is closed right now.
  const scheduleMode = searchParams.get("schedule") === "1";
  const promoPercentParam = Number(searchParams.get("pct"));
  // pct is display-only, carried along from the ad link so this banner can
  // render without a network round-trip — the real discount is always
  // resolved server-side from promotionId, never trusted from the URL.
  const promoDiscountPercent = promotionId && promoPercentParam > 0 ? promoPercentParam : null;

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [shop, setShop] = useState<BookingShop | null>(null);
  const [services, setServices] = useState<PublicService[]>([]);
  const [notFound, setNotFound] = useState(false);

  const [serviceType, setServiceType] = useState("");
  const [description, setDescription] = useState("");
  const [requestPhotoUrl, setRequestPhotoUrl] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [isEmergency, setIsEmergency] = useState(false);
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [slotRefresh, setSlotRefresh] = useState(0);
  const [availability, setAvailability] = useState<DateAvailability | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Set once the request is sent — the id of the new ticket, for the "View My Request Status" link.
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);
  // "Tue, Sep 29 at 9:00 AM" for a scheduled request, shown on the confirmation.
  const [submittedWhen, setSubmittedWhen] = useState<string | null>(null);
  const [openingChat, setOpeningChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
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
    if (scheduleMode) {
      const firstDay = nextOpenDay(toIsoDate(new Date()), shopRow.business_days);
      if (firstDay) setPreferredDate(firstDay);
    }
    listPublicShopServices(shopRow.id).then(setServices).catch(() => {});

    if (current) {
      listCustomerAddresses()
        .then((list) => {
          setAddresses(list);
          const preferred = list.find((a) => a.isDefault) ?? list[0];
          if (preferred) setSelectedAddressId(preferred.id);
        })
        .catch(() => {});
    }
  }, [shopSlug, scheduleMode]);

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

    const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
    const serviceAddress = (selectedAddress && formatAddress(selectedAddress)) || manualAddress;
    if (!serviceAddress) {
      setError("Please provide your service address.");
      return;
    }

    if (scheduleMode && !isEmergency && (!preferredDate || !preferredTime)) {
      setError("Pick a day and a time for your request.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const ticketId = await submitBooking({
        shopSlug,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone ?? "",
        serviceType,
        serviceAddress,
        preferredDate: isEmergency ? null : preferredDate || null,
        preferredTime: isEmergency || !preferredDate ? null : preferredTime || null,
        description,
        requestPhotoUrl,
        isEmergency,
        latitude: selectedAddress?.latitude ?? null,
        longitude: selectedAddress?.longitude ?? null,
        promotionId,
      });
      setSubmittedWhen(
        !isEmergency && preferredDate
          ? `${formatDayLong(preferredDate)}${preferredTime ? ` at ${formatTimeOfDay(preferredTime)}` : ""}`
          : null
      );
      setSubmittedTicketId(ticketId);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not submit booking.";
      setError(message);
      if (message.includes("just taken")) {
        // Somebody else got that hour first — let the customer see what is still open.
        setPreferredTime("");
        setSlotRefresh((n) => n + 1);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-navy">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-navy px-6 text-center">
        <p className="text-sm text-slate-400">
          We couldn&apos;t find this business. Double-check the link and try again.
        </p>
      </main>
    );
  }

  if (!customer) {
    return <CustomerAuthScreen onSignedIn={load} />;
  }

  async function handleMessageOwner() {
    setOpeningChat(true);
    setChatError(null);
    try {
      const conversationId = await ensureCustomerConversation(shopSlug);
      router.push(`/customer/messages/${conversationId}`);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "Couldn't open the chat. Try again.");
      setOpeningChat(false);
    }
  }

  if (submittedTicketId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-brand-navy px-6 text-center">
        <p className="text-lg font-bold text-white">Request sent!</p>
        <p className="mt-1.5 max-w-xs text-sm text-slate-400">
          {shop?.shop_name} will review your request and assign a technician
          soon.
        </p>
        {submittedWhen && (
          <p className="mt-3 rounded-full bg-brand-orange/15 px-4 py-1.5 text-xs font-bold text-brand-orange">
            Scheduled for {submittedWhen}
          </p>
        )}
        <button
          type="button"
          onClick={() => router.push(`/client/${submittedTicketId}`)}
          className="mt-6 w-full max-w-xs rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
        >
          View My Request Status
        </button>
        <button
          type="button"
          onClick={handleMessageOwner}
          disabled={openingChat}
          className="mt-3 w-full max-w-xs rounded-full border border-white/20 px-6 py-3 text-sm font-bold text-slate-200 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {openingChat ? "Opening chat..." : "Message the Owner"}
        </button>
        {chatError && (
          <p role="alert" className="mt-3 max-w-xs text-xs text-red-400">
            {chatError}
          </p>
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-navy px-6 py-10">
      <div className="mx-auto max-w-md">
        <button
          type="button"
          onClick={goBack}
          className="text-sm font-medium text-slate-400 hover:text-white"
        >
          ← Back
        </button>

        <div className="mt-4 flex items-center gap-3">
          {shop?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shop.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
          )}
          <div>
            <p className="text-lg font-bold text-white">{shop?.shop_name}</p>
            <p className="text-xs text-slate-400">Request a service</p>
          </div>
        </div>

        {shop && (shop.default_hourly_rate > 0 || services.length > 0) && (
          <div className="mt-4 rounded-2xl bg-white/5 p-4 shadow-md shadow-black/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Pricing
            </p>
            {shop.default_hourly_rate > 0 && (
              <p className="mt-1.5 text-sm text-slate-300">
                Standard Labor Fee:{" "}
                <span className="font-semibold text-white">
                  {shop.currency} {shop.default_hourly_rate.toFixed(2)}/hr
                </span>
              </p>
            )}
            {services.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-start justify-between gap-2 rounded-xl bg-white/5 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-slate-300">{service.name}</p>
                      {service.description && (
                        <p className="text-xs text-slate-500">{service.description}</p>
                      )}
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-white">
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-2xl bg-white/5 p-6 shadow-md shadow-black/20">
          {scheduleMode && (
            <div className="rounded-xl bg-brand-orange/10 px-3.5 py-3">
              <p className="text-sm font-semibold text-brand-orange">Schedule your request</p>
              <p className="mt-0.5 text-xs text-slate-300">
                Pick the day and time you&apos;d like. If that time is taken, choose another hour or try the next day —
                {shop?.shop_name ? ` ${shop.shop_name}` : " the business"} will confirm it.
              </p>
            </div>
          )}
          {promoDiscountPercent && (
            <p className="rounded-xl bg-brand-emerald/10 px-3.5 py-2.5 text-sm font-semibold text-brand-emerald">
              ✓ {promoDiscountPercent}% off this booking&apos;s service fee will be applied.
            </p>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400">
              What do you need done?
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Deep cleaning, AC repair..."
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="mt-1 w-full rounded-xl bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-blue focus:outline-none"
            />
          </div>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl px-3.5 py-3 transition-colors ${
              isEmergency
                ? "bg-red-500/15 ring-1 ring-red-500/50"
                : "bg-white/5 hover:bg-white/10"
            }`}
          >
            <input
              type="checkbox"
              checked={isEmergency}
              onChange={(e) => setIsEmergency(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-red-500"
            />
            <span>
              <span className="block text-sm font-semibold text-white">
                🚨 This is an emergency
              </span>
              <span className="block text-xs text-slate-400">
                {shop?.night_shift_enabled && !isShopOpenNow(shop)
                  ? `Skips scheduling — ${shop.shop_name} is closed right now, but its night-shift technician is on call and will be alerted right away.`
                  : "Skips scheduling — we'll try to dispatch the nearest available technician to you right away."}
              </span>
            </span>
          </label>

          <div>
            <label className="block text-xs font-medium text-slate-400">
              Describe the issue (optional)
            </label>
            <textarea
              rows={3}
              placeholder="Explain what's going on so the technician can prepare..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-xl bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-blue focus:outline-none"
            />
          </div>

          <PhotoUploadField
            folder="requests"
            photoUrl={requestPhotoUrl}
            onChange={setRequestPhotoUrl}
            label="Photo of the issue (optional)"
          />

          <div>
            <label className="block text-xs font-medium text-slate-400">
              Service Address
            </label>
            {addresses.length > 0 ? (
              <div className="mt-1.5 space-y-1.5">
                {addresses.map((address) => (
                  <label
                    key={address.id}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-sm transition-colors ${
                      selectedAddressId === address.id
                        ? "bg-brand-blue/15 ring-1 ring-brand-blue"
                        : "bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <input
                      type="radio"
                      name="serviceAddress"
                      checked={selectedAddressId === address.id}
                      onChange={() => setSelectedAddressId(address.id)}
                      className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue focus:ring-brand-blue"
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="font-semibold text-white">{address.label}</span>
                        {address.isDefault && (
                          <span className="rounded-full bg-brand-emerald/15 px-2 py-0.5 text-[10px] font-semibold text-brand-emerald">
                            Default
                          </span>
                        )}
                      </span>
                      <span className="block text-slate-400">{formatAddress(address)}</span>
                    </span>
                  </label>
                ))}
                <button
                  type="button"
                  onClick={() => setShowAddAddress(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/20 px-3.5 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:border-brand-blue hover:text-brand-blue"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add New Address
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  required
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="Where should the technician go?"
                  className="mt-1 w-full rounded-xl bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-blue focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowAddAddress(true)}
                  className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/20 px-3.5 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:border-brand-blue hover:text-brand-blue"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Save a pinned address instead
                </button>
              </>
            )}
          </div>

          {shop && !isEmergency && (
            <div>
              <label className="block text-xs font-medium text-slate-400">
                {scheduleMode ? "Day and time" : "Preferred Date (optional)"}
              </label>
              <div className="mt-1">
                <AvailabilityCalendar
                  key={preferredDate.slice(0, 7)}
                  businessDays={shop.business_days}
                  businessHoursOpen={shop.business_hours_open}
                  businessHoursClose={shop.business_hours_close}
                  selectedDate={preferredDate}
                  onSelect={(day) => {
                    setPreferredDate(day);
                    setPreferredTime("");
                  }}
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
                      ? "text-amber-400"
                      : "text-brand-emerald"
                  }`}
                >
                  {availability.active_staff_count > 0 &&
                  availability.booked_count >= availability.active_staff_count
                    ? "This day looks fully booked — the business may still fit you in."
                    : "Looks available on this day."}
                </p>
              )}
              {preferredDate && (
                <TimeSlotPicker
                  shopSlug={shopSlug}
                  date={preferredDate}
                  hoursOpen={shop.business_hours_open}
                  hoursClose={shop.business_hours_close}
                  value={preferredTime}
                  onChange={setPreferredTime}
                  onNextDay={(() => {
                    const next = nextOpenDay(preferredDate, shop.business_days);
                    return next
                      ? () => {
                          setPreferredDate(next);
                          setPreferredTime("");
                        }
                      : null;
                  })()}
                  refreshKey={slotRefresh}
                />
              )}
            </div>
          )}

          <p className="text-xs text-slate-400">
            We&apos;ll contact you at {customer.email}
            {customer.phone ? ` or ${customer.phone}` : ""}.
          </p>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`w-full rounded-full px-6 py-3.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:cursor-not-allowed disabled:opacity-60 ${
              isEmergency
                ? "bg-gradient-to-r from-red-500 to-red-700"
                : "bg-gradient-to-r from-brand-sky to-brand-blue-dark"
            }`}
          >
            {submitting
              ? "Sending..."
              : isEmergency
                ? "🚨 Send Emergency Request"
                : "Send Request"}
          </button>
        </form>
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
            setSelectedAddressId(address.id);
            setShowAddAddress(false);
          }}
        />
      )}
    </main>
  );
}
