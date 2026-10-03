export type AdminCustomerBooking = {
  id: string;
  shop_name: string;
  service_type: string;
  status: string;
  created_at: string;
};

export type AdminCustomerDetail = {
  profile: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    country: string | null;
    region: string | null;
    city: string | null;
    barangay: string | null;
    created_at: string;
  };
  bookings: AdminCustomerBooking[];
};
