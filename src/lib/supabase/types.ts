export type Currency = "USD" | "AUD" | "GBP" | "EUR";
export type StaffRole = "OWNER" | "MANAGER" | "TECHNICIAN";

export type Shop = {
  id: string;
  created_at: string;
  shop_name: string;
  slug: string;
  logo_url: string | null;
  website_header_url: string | null;
  primary_color_hex: string;
  accent_color_hex: string;
  website_template: string;
  website_font_family: string;
  website_font_scale: number;
  website_button_style: string;
  website_bg_color: string | null;
  website_card_color: string;
  website_text_color: string;
  website_heading_color: string;
  website_price_color: string;
  website_muted_color: string;
  website_headline: string | null;
  website_subheadline: string | null;
  currency: Currency;
  tax_id_ein: string | null;
  is_verified: boolean;
  has_quality_booster: boolean;
  has_marketing_tier: boolean;
  address: string | null;
  contact_phone: string | null;
  warranty_days: number;
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
  default_service_fee: number;
  mobile_app_font_family: string;
  city: string | null;
  business_category: string | null;
  is_publicly_listed: boolean;
  /** Test/demo accounts: no paid-seat prompts. Only the developer console can change it. */
  unlimited_tech_seats: boolean;
  /** The owner has technicians on call for emergencies while the shop is closed. */
  night_shift_enabled: boolean;
  /** IANA name ("Asia/Manila") — what "closed right now" is measured in. Saved with the working hours. */
  timezone: string;
  business_hours_open: string | null;
  business_hours_close: string | null;
  business_days: string[];
  latitude: number | null;
  longitude: number | null;
  country: string | null;
  region: string | null;
  barangay: string | null;
  default_tasks: string[];
  accepted_payment_methods: string[];
  /** Look of the technician app and the customer's job page. */
  mobile_app_theme: "light" | "dark" | "auto";
  /** False lets a technician start or finish a job without a photo. */
  require_before_after_photos: boolean;
  require_customer_signature: boolean;
  /** False turns the "must be near the job site" check off entirely. */
  geofence_enforced: boolean;
  show_job_prices_to_techs: boolean;
  allow_onsite_quote_additions: boolean;
  /** Text the owner adds to the technician app (App Builder → App Information). */
  mobile_app_welcome: string | null;
  mobile_app_announcement_title: string | null;
  mobile_app_announcement: string | null;
  mobile_app_office_phone: string | null;
  mobile_app_job_reminder: string | null;
};

export type StaffMember = {
  id: string;
  shop_id: string;
  auth_user_id: string | null;
  username: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  hourly_rate: number;
  overtime_multiplier: number;
  is_active: boolean;
  role: StaffRole;
  created_at: string;
  location_token: string;
  /** On call for after-hours emergencies. Only the owner or a manager can change it. */
  is_night_shift: boolean;
  /** null = Main Branch (the shop's own address/hours). Owners are never branch-scoped regardless of this. */
  branch_id: string | null;
};

/** A second physical location under the same shop account — its own address, hours, manager and staff. */
export type Branch = {
  id: string;
  shop_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  contact_phone: string | null;
  city: string | null;
  region: string | null;
  business_hours_open: string | null;
  business_hours_close: string | null;
  business_days: string[];
  timezone: string;
  is_active: boolean;
  created_at: string;
};

export type JobStatus =
  | "PENDING"
  | "REJECTED"
  | "UNASSIGNED"
  | "SCHEDULED"
  | "ESTIMATE_PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "DISPUTED"
  | "APPROVED"
  | "CANCELLED";

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
  start_photo_hash: string | null;
  end_photo_hash: string | null;
  start_geofence_distance_m: number | null;
  end_geofence_distance_m: number | null;
  start_checklist: string[];
  end_checklist: string[];
  started_at: string | null;
  completed_at: string | null;
  estimated_hours: number;
  actual_hours: number;
  total_labor_cost: number;
  service_fee: number;
  tax_amount: number;
  total_invoice_amount: number;
  payment_verified_at: string | null;
  payment_verified_amount: number;
  payment_verified_by: string | null;
  payment_receipt_url: string | null;
  client_payment_confirmed_at: string | null;
  invoice_paid_at: string | null;
  invoice_paid_by: string | null;
  quote_submitted_at: string | null;
  quote_approved_at: string | null;
  warranty_expires_at: string | null;
  warranty_claim_of_ticket_id: string | null;
  is_emergency: boolean;
  /** An emergency that came in while the shop was closed and had a night shift — the night shift's to answer. */
  after_hours: boolean;
  /** When the customer rated the finished job (set by the database when the review is saved). */
  customer_reviewed_at: string | null;
  booking_latitude: number | null;
  booking_longitude: number | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  cancellation_fee_applied: boolean;
  dispute_notes: string | null;
  client_viewed_at: string | null;
  staff_accepted_at: string | null;
  preferred_date: string | null;
  /** Hour the customer picked for a scheduled request ("09:00:00"), if any. */
  preferred_time: string | null;
  description: string | null;
  request_photo_url: string | null;
  discount_percent: number | null;
  selected_products: { product_id: string; name: string; price: number; quantity: number }[];
  payment_method: string | null;
  signature_url: string | null;
  created_at: string;
  /** When the technician tapped "I'm on my way"; cleared if the job is re-assigned. */
  en_route_at: string | null;
  /** Short per-shop job number, shown everywhere as #JOB-0007 (see lib/jobNumber.ts). */
  job_number: number;
  /** PAID once proof of payment is in (or the shop confirmed it); the technician's signature step waits on it. */
  payment_status: "UNPAID" | "PAID";
  /** null = Main Branch. */
  branch_id: string | null;
};

/** One row of the photo registry: the photo's address and fingerprint outlive the file on the server. */
export type JobPhoto = {
  id: string;
  /** "PH-7K3Q9X2M" — the photo's address. */
  code: string;
  job_ticket_id: string;
  kind: "START" | "END" | "REQUEST" | "RECEIPT";
  /** SHA-256 of the exact bytes; null for a photo from before fingerprints were recorded. */
  sha256: string | null;
  bytes: number | null;
  taken_at: string;
  /** When the file was removed from the server (the code and fingerprint stay). */
  purged_at: string | null;
  /** The stored bytes no longer matched the fingerprint taken at capture. */
  sha256_mismatch: boolean;
};

/** A review as the owner sees it when choosing which to ask to have removed. */
export type ReviewForModeration = {
  id: string;
  rating: number;
  comment: string | null;
  photo_url: string | null;
  created_at: string;
  client_name: string;
  /** Set while the review is part of a request that is still waiting. */
  pending_request_id: string | null;
  pending_delete_after: string | null;
};

export type ReviewRemovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

/** What was asked to be removed, as it was when the owner asked — it stays readable after the review is gone. */
export type ReviewRemovalItem = {
  id: string;
  review_id: string | null;
  rating: number;
  comment: string | null;
  client_name: string | null;
  reviewed_at: string;
};

/** The owner's request to remove reviews: waits 3 days (`delete_after`), then the reviews are removed unless it was declined. */
export type ReviewRemovalRequest = {
  id: string;
  status: ReviewRemovalStatus;
  reason: string | null;
  created_at: string;
  delete_after: string;
  decided_at: string | null;
  decision_note: string | null;
  review_deletion_request_items: ReviewRemovalItem[];
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

export type ShopService = {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  price: number;
  extra_cost: number;
  created_at: string;
};

export type ShopProduct = {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  price: number;
  cost_price: number;
  quantity: number;
  photo_url: string | null;
  category: string | null;
  sku: string | null;
  unit: string;
  expiry_date: string | null;
  created_at: string;
};

export type StockMovement = {
  id: string;
  shop_id: string;
  product_id: string;
  change_qty: number;
  note: string | null;
  created_at: string;
};

export type ShopPromotion = {
  id: string;
  shop_id: string;
  title: string;
  description: string | null;
  discount_percent: number | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
};
