// The 17 official PSGC regions — small and stable enough to ship directly
// to the client. Provinces/cities/barangays are far larger (1,600+ and
// 41,000+ rows respectively) and are fetched on demand from /api/geo/*
// instead, to keep them out of the client bundle.
export const PH_REGIONS = [
  { name: "REGION I (ILOCOS REGION)", reg_code: "01" },
  { name: "REGION II (CAGAYAN VALLEY)", reg_code: "02" },
  { name: "REGION III (CENTRAL LUZON)", reg_code: "03" },
  { name: "REGION IV-A (CALABARZON)", reg_code: "04" },
  { name: "REGION IV-B (MIMAROPA)", reg_code: "17" },
  { name: "REGION V (BICOL REGION)", reg_code: "05" },
  { name: "REGION VI (WESTERN VISAYAS)", reg_code: "06" },
  { name: "REGION VII (CENTRAL VISAYAS)", reg_code: "07" },
  { name: "REGION VIII (EASTERN VISAYAS)", reg_code: "08" },
  { name: "REGION IX (ZAMBOANGA PENINSULA)", reg_code: "09" },
  { name: "REGION X (NORTHERN MINDANAO)", reg_code: "10" },
  { name: "REGION XI (DAVAO REGION)", reg_code: "11" },
  { name: "REGION XII (SOCCSKSARGEN)", reg_code: "12" },
  { name: "NATIONAL CAPITAL REGION (NCR)", reg_code: "13" },
  { name: "CORDILLERA ADMINISTRATIVE REGION (CAR)", reg_code: "14" },
  { name: "BANGSAMORO AUTONOMOUS REGION IN MUSLIM MINDANAO (BARMM)", reg_code: "15" },
  { name: "REGION XIII (CARAGA)", reg_code: "16" },
] as const;
