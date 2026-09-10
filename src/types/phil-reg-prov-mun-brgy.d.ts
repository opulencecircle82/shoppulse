declare module "phil-reg-prov-mun-brgy" {
  export type Region = { name: string; reg_code: string };
  export type Province = { name: string; reg_code: string; prov_code: string };
  export type CityMun = { name: string; prov_code: string; mun_code: string };
  export type Barangay = { name: string; mun_code: string };

  const phil: {
    regions: Region[];
    provinces: Province[];
    city_mun: CityMun[];
    barangays: Barangay[];
    getProvincesByRegion: (regCode: string) => Province[];
    getCityMunByProvince: (provCode: string) => CityMun[];
    getBarangayByMun: (munCode: string) => Barangay[];
    sort: <T>(arr: T[], sort?: "A" | "Z") => T[];
  };

  export default phil;
}
