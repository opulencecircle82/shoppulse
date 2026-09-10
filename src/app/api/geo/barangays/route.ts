import phil from "phil-reg-prov-mun-brgy";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const munCode = searchParams.get("mun");

  if (!munCode) {
    return Response.json({ error: "Missing mun" }, { status: 400 });
  }

  const barangays = phil.getBarangayByMun(munCode);
  return Response.json({ barangays: phil.sort(barangays, "A") });
}
