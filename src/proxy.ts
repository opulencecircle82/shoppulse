import { NextResponse, type NextRequest } from "next/server";

// Subdomain labels that must never be treated as a shop slug, even once
// ROOT_DOMAIN is configured — these are reserved for the app itself.
const RESERVED_SUBDOMAINS = new Set(["www", "app", "api", "admin"]);

/**
 * Lets a shop's public website be reached at
 * `<slug>.<ROOT_DOMAIN>` instead of `<ROOT_DOMAIN>/site/<slug>` — e.g.
 * `george-electrical-services-8qdxl.shoppulse-web.app` rewrites internally
 * to `/site/george-electrical-services-8qdxl`.
 *
 * Inert until ROOT_DOMAIN is set (no custom domain is configured yet), and
 * only rewrites the subdomain's homepage — every other path (booking,
 * login, dashboard, etc.) is left alone so the rest of the app keeps
 * working unchanged on any hostname.
 */
export function proxy(request: NextRequest) {
  const rootDomain = process.env.ROOT_DOMAIN;
  if (!rootDomain) return NextResponse.next();

  const hostname = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();

  if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
    return NextResponse.next();
  }

  if (!hostname.endsWith(`.${rootDomain}`)) {
    // Not our root domain at all (localhost, a vercel.app preview URL,
    // etc.) — leave it to the normal routes.
    return NextResponse.next();
  }

  const subdomain = hostname.slice(0, -(rootDomain.length + 1));
  if (!subdomain || subdomain.includes(".") || RESERVED_SUBDOMAINS.has(subdomain)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/site/${subdomain}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: "/",
};
