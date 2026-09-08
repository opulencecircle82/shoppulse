export type Currency = "USD" | "AUD" | "GBP" | "EUR";
export type StaffRole = "OWNER" | "MANAGER" | "TECHNICIAN";

export type Shop = {
  id: string;
  created_at: string;
  shop_name: string;
  slug: string;
  logo_url: string | null;
  primary_color_hex: string;
  accent_color_hex: string;
  currency: Currency;
  tax_id_ein: string | null;
  is_verified: boolean;
  has_quality_booster: boolean;
  has_marketing_tier: boolean;
  address: string | null;
  geofence_radius_meters: number;
  shift_grace_minutes: number;
  lunch_break_minutes: number;
  watermark_show_logo: boolean;
  watermark_show_timestamp: boolean;
  watermark_show_gps: boolean;
  white_label_domain: string | null;
};

export type StaffMember = {
  id: string;
  shop_id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  hourly_rate: number;
  overtime_multiplier: number;
  is_active: boolean;
  role: StaffRole;
  created_at: string;
};
