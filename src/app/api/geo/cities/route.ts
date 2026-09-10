import phil from "phil-reg-prov-mun-brgy";

// Cities/municipalities scoped to a region. The dataset only links
// city_mun rows to a province, not directly to a region, so this fans out
// through every province in the region and merges the results — the
// Province tier itself isn't shown as a separate field in the UI.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const regionCode = searchParams.get("region");

  if (!regionCode) {
    return Response.json({ error: "Missing region" }, { status: 400 });
  }

  const provinces = phil.getProvincesByRegion(regionCode);
  const cities = provinces.flatMap((province) =>
    phil.getCityMunByProvince(province.prov_code)
  );

  return Response.json({ cities: phil.sort(cities, "A") });
}
