import type { ReviewRemovalRequest } from "@/lib/supabase/types";

/** Everything the developer console shows about one account (`GET /api/admin/shops/[id]/detail`). */
export type AdminShopDetail = {
  profile: {
    id: string;
    shop_name: string;
    slug: string;
    address: string | null;
    city: string | null;
    region: string | null;
    country: string | null;
    business_category: string | null;
    contact_phone: string | null;
    currency: string;
    is_publicly_listed: boolean;
    latitude: number | null;
    longitude: number | null;
    business_hours_open: string | null;
    business_hours_close: string | null;
    business_days: string[];
    night_shift_enabled: boolean;
    created_at: string;
  };
  owner: { full_name: string; email: string; phone: string | null } | null;
  counts: {
    staff: number;
    managers: number;
    technicians: number;
    /** Different people (by email) who have booked with this shop. */
    customers: number;
    jobs: number;
    jobsOpen: number;
    jobsFinished: number;
    reviews: number;
    avgRating: number | null;
    lastJobAt: string | null;
  };
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    photo_url: string | null;
    created_at: string;
    client_name: string | null;
  }[];
  /** Newest first. The console acts on the ones still PENDING; the rest are history. */
  removalRequests: ReviewRemovalRequest[];
  /** Additional locations under this account — empty for the (still common) single-location shop, which
   * keeps using its own profile address/hours as its one and only "Main Branch". */
  branches: {
    id: string;
    name: string;
    address: string;
    is_active: boolean;
    manager: { full_name: string; email: string } | null;
    technician_count: number;
    job_count: number;
    customer_count: number;
  }[];
};
