# ShopPulse Engineering Rules

Code-quality and architecture rules for this repo. Companion to
`DESIGN_GUIDELINES.md` (visual/UX rules) — this file covers how code gets
written, not how it looks.

## Stack — don't drift from this

Next.js (App Router) + Supabase (Postgres/RLS/Auth/Storage), deployed on
Vercel. The "native" apps (customer, and any future staff app) are **thin
Flutter WebView wrappers around this same web app** — not separate React
Native/Expo builds. If a spec or reference doc assumes React Native, Expo,
or a Shift State Machine with states like `OFF_DUTY`/`DEPOT_CHECKIN`/
`ARRIVED_GEOFENCED`, it's describing a different, hypothetical rebuild —
not this codebase. The real ticket lifecycle lives in `job_tickets.status`
(`PENDING`, `SCHEDULED`, `ESTIMATE_PENDING`, `IN_PROGRESS`, `COMPLETED`,
`APPROVED`, `DISPUTED`, `CANCELLED`, `REJECTED`, `UNASSIGNED`) — extend
that enum, don't invent a parallel one.

## Architecture & data integration

- **No siloed features.** Anything a technician does must be visible to
  the owner dashboard and, where relevant, the customer — this app has
  exactly one source of truth (Supabase), not per-surface caches. Every
  new field on `job_tickets` (or any table) needs its consumers checked:
  who else reads this row (`select("*")` call sites), and does the new
  column need surfacing there too.
- **Real-time-enough sync**, not literal websocket push everywhere. The
  established pattern is short interval polling scoped to exactly what
  might have changed (see `fetchQuoteApproval`/`fetchPaymentVerification`
  in `jobActions.ts` — polls two fields, not the whole ticket) plus
  Supabase's own realtime where it's already wired (chat). Match that
  pattern instead of introducing a new sync mechanism per feature.
- **RPC-over-RLS for anything sensitive.** A `SECURITY DEFINER` Postgres
  function that resolves the caller via `auth.uid()` internally — see any
  function in `supabase/migrations`. Plain `supabase.from(...).update()`
  calls are fine for a signed-in user updating their own row (that's most
  of `jobActions.ts`); reach for an RPC when the write needs to check
  something the client shouldn't be trusted to check itself (claiming a
  job, approving a quote, admin actions).

## Code quality

- **Zero placeholder logic.** No `// TODO`, no mock/fake data standing in
  for a real integration, no function that returns a hardcoded success
  without doing the thing. If something is genuinely out of scope (no
  credentials, no time, needs a decision first), say so plainly instead of
  faking it — e.g. phone-masking was flagged as needing a real telephony
  provider rather than stubbed out fake.
- **Strict TypeScript.** No `any` without a specific reason in a comment.
  Every RPC call's shape, every new table column, gets reflected in
  `src/lib/supabase/types.ts`.
- **Handle errors at every async boundary.** Every Supabase call, upload,
  or `fetch` that can fail gets a real error path shown to the user (see
  the `try/catch` + `setError(...)` pattern used throughout `tech/` and
  `dashboard/` components) — never a silently swallowed rejection.
- **No dead code, no leftover `console.log`.** Remove debugging output
  and unused branches before a change is done, not "later."
- **Self-documenting over commented.** Name things so the comment isn't
  needed. Only comment a genuinely non-obvious reason — a workaround, an
  invariant, a "why not the obvious approach" — matching the comments
  already in this codebase (e.g. the `<label htmlFor>` vs `.click()` note
  in `TechJobScreen.tsx`).

## File organization

Real structure, already ~150 files deep — extend it, don't invent a
parallel one:

- Components: `src/components/{domain}/PascalCase.tsx` — domains are
  `tech/`, `customer/`, `dashboard/` (owner), `chat/`, `shared/` (cross-
  surface), `auth/`, `ui/`, `landing/`.
- Business logic / data access: `src/lib/{domain}/camelCase.ts` — mirrors
  the same domains (`lib/tech/jobActions.ts`, `lib/customer/bookings.ts`).
  Pure helpers with no domain (GPS math, hashing) live in the relevant
  domain folder next to their one caller, or `src/lib/shared` if genuinely
  cross-domain.
- Types: `src/lib/supabase/types.ts` — one place, not scattered per
  feature.
- Database: every schema change is a `supabase/migrations` migration
  applied through the Supabase tool, named `snake_case_describing_change`
  — never a manual/undocumented schema edit.

## Component size

Keep new components focused — a few hundred lines covering one screen's
concerns is normal here (`CustomerHomeScreen.tsx` is ~475,
`TechJobScreen.tsx` similar), but if a single component is juggling more
than roughly two or three distinct concerns (e.g. "the whole job lifecycle
UI" vs. "just the estimate form"), pull the sub-concern into its own
component the way `SelectedProductsPicker` and `SignaturePad` already are.
Split for clarity when you notice it, not on a hard line-count gate.

## Imports

Group in this order, blank line between groups:

1. React / Next.js
2. Third-party libraries (`lucide-react`, etc.)
3. Internal absolute imports (`@/lib/...`, `@/components/...`)
4. Types (if not already covered by an internal import)

## State management

Local component state (`useState`) plus Supabase as the source of truth is
the established pattern — there's no Redux/Zustand/global-store dependency
in this app, and none should be added without a real reason. Avoid
threading a prop through more than two or three component layers; lift
the fetch to the nearest shared ancestor (see `src/app/tech/page.tsx`
owning session/data state for its child screens) instead of drilling or
reaching for a new state library.

## Currency & internationalization

Every price display reads `shop.currency` dynamically (`{shop.currency}
{amount.toFixed(2)}`) — never a hardcoded `$` or `₱`. Shops are expected to
eventually span multiple currencies (not just PHP), so this is a hard
rule even though every shop tested so far uses PHP.

## Working with Claude on this repo

- Jump straight into the code change — a short one-line note on what's
  changing is enough context, not a long plan restated before every edit.
- When editing or creating a file, write the complete resulting file (or
  a precise, minimal diff via the edit tool) — never a partial snippet
  with "...rest stays the same."
- Verify before claiming done: `tsc --noEmit`, `eslint`, `next build`, and
  — for anything touching a real user flow — a disposable-account test
  against the live Supabase project, cleaned up afterward with a
  zero-leftover-rows check.
