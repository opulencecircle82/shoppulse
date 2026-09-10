import phil from "phil-reg-prov-mun-brgy";

// Public reference data (official PSGC regions) — no auth needed, same as
// any other static lookup list.
export async function GET() {
  return Response.json({ regions: phil.regions });
}
