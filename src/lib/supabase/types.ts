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
  mandatory_live_camera: boolean;
  default_hourly_rate: number;
  default_overtime_multiplier: number;
  mobile_app_font_family: string;
  city: string | null;
  business_category: string | null;
  is_publicly_listed: boolean;
};

export type StaffMember = {
  id: string;
  shop_id: string;
  auth_user_id: string | null;
  username: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  hourly_rate: number;
  overtime_multiplier: number;
  is_active: boolean;
  role: StaffRole;
  created_at: string;
  location_token: string;
};

export type JobStatus =
  | "UNASSIGNED"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "DISPUTED"
  | "APPROVED";

export type JobTicket = {
  id: string;
  shop_id: string;
  assigned_staff_id: string | null;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  service_address: string;
  service_type: string;
  status: JobStatus;
  start_photo_url: string | null;
  end_photo_url: string | null;
  start_checklist: string[];
  end_checklist: string[];
  started_at: string | null;
  completed_at: string | null;
  estimated_hours: number;
  actual_hours: number;
  total_labor_cost: number;
  total_invoice_amount: number;
  dispute_notes: string | null;
  client_viewed_at: string | null;
  created_at: string;
};

export type StaffLiveLocation = {
  staff_id: string;
  shop_id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  updated_at: string;
};

export type LocalNetworkAd = {
  id: string;
  shop_id: string;
  business_category: string;
  ad_headline: string;
  ad_body: string;
  target_zip_codes: string[] | null;
  promo_code: string | null;
  click_url: string;
  is_active: boolean;
};
