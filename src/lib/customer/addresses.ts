import { supabase } from "@/lib/supabase/client";

export type CustomerAddress = {
  id: string;
  label: string;
  country: string | null;
  region: string | null;
  city: string | null;
  barangay: string | null;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
};

const ADDRESS_FIELDS =
  "id, label, country, region, city, barangay, latitude, longitude, is_default";

function mapAddressRow(data: {
  id: string;
  label: string;
  country: string | null;
  region: string | null;
  city: string | null;
  barangay: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
}): CustomerAddress {
  return {
    id: data.id,
    label: data.label,
    country: data.country,
    region: data.region,
    city: data.city,
    barangay: data.barangay,
    latitude: data.latitude,
    longitude: data.longitude,
    isDefault: data.is_default,
  };
}

/** Joins an address's location fields into one display line, same
 * formatting as the customer's own registration address used to have. */
export function formatAddress(address: CustomerAddress): string {
  return [address.barangay, address.city, address.region].filter(Boolean).join(", ");
}

/** RLS (customer_id = current_customer_id()) scopes this to the signed-in
 * customer's own saved addresses. Default address first. */
export async function listCustomerAddresses(): Promise<CustomerAddress[]> {
  const { data, error } = await supabase
    .from("customer_addresses")
    .select(ADDRESS_FIELDS)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapAddressRow);
}

export async function createCustomerAddress(params: {
  customerId: string;
  label: string;
  country: string;
  region: string;
  city: string;
  barangay: string;
  latitude: number | null;
  longitude: number | null;
  makeDefault: boolean;
}): Promise<CustomerAddress> {
  const { data, error } = await supabase
    .from("customer_addresses")
    .insert({
      customer_id: params.customerId,
      label: params.label,
      country: params.country || null,
      region: params.region || null,
      city: params.city || null,
      barangay: params.barangay || null,
      latitude: params.latitude,
      longitude: params.longitude,
      is_default: params.makeDefault,
    })
    .select(ADDRESS_FIELDS)
    .single();

  if (error) throw error;

  if (params.makeDefault) {
    await supabase.rpc("set_default_customer_address", { p_address_id: data.id });
  }

  return mapAddressRow(data);
}

export async function setDefaultCustomerAddress(addressId: string) {
  const { error } = await supabase.rpc("set_default_customer_address", {
    p_address_id: addressId,
  });
  if (error) throw new Error(error.message);
}

export async function deleteCustomerAddress(addressId: string) {
  const { error } = await supabase.from("customer_addresses").delete().eq("id", addressId);
  if (error) throw new Error(error.message);
}
