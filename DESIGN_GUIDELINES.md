# ShopPulse Design Guidelines

Rules for every screen built in this app, web or wrapped-native. The goal is
simple: it should look like one person with real design taste built the
whole product on purpose — never like separate AI-generated screens bolted
together. Read this before building or changing any UI, and check new work
against it before calling it done.

## The one-sentence rule

**Before shipping a screen, ask: "would this specific screen make sense for
any other SaaS product, or only for ShopPulse?"** If it could be any app,
it's generic — it hasn't actually used the brand tokens, voice, and patterns
below, it's just reaching for whatever a component library defaults to.

## Telltale "AI-generated" signs — never do these

These are the specific patterns that make a screen read as AI-slop at a
glance. Avoid all of them, no exceptions without asking first:

- **Purple/violet gradient backgrounds or buttons.** This is the single
  most recognizable "generic AI SaaS" tell there is. ShopPulse's palette
  has zero purple in it — see below.
- **Generic hero copy** — "Welcome to the future of field service",
  "Empowering your business", "Streamline your workflow". Every label and
  message in this app names a real, specific thing a real user is doing
  ("Sign in to see your jobs and book new ones", not "Get started today").
- **Emoji used as decoration.** The 🚨 on emergency job badges is an
  intentional, approved exception (it's a real urgency signal, used
  exactly once per badge). Anywhere else — no emoji in headings, buttons,
  or body copy.
- **Uniform corner radii and shadows on everything with no hierarchy.**
  Not every box is `rounded-2xl` with a glow. Primary actions get the
  gradient + shadow treatment (see Buttons below); everything else is
  plain `bg-white/5` on the dark apps (or a plain white card with a hairline
  border on the light owner dashboard) — the glow is what makes the real CTA
  findable.
  If everything glows, nothing does. Use `rounded-full` only for actual
  pill content (badges, buttons) — never as a generic rounding default.
- **Icon-for-the-sake-of-icon.** Every icon in this app maps to one
  `lucide-react` glyph with a real meaning (MapPin = a location action,
  Bell = notifications). Don't add an icon to a label just to make it
  "feel designed."
- **A sidebar or nav rail on a phone-width screen.** This exact mistake
  shipped once (see the Tech Home Screen redesign, Sept 2026) — a
  fixed-width vertical rail is a desktop pattern, and on a ~390–430px
  viewport it eats 15–20% of the screen for permanent chrome. Every
  screen in this app is viewed on a phone or a WebView wrapping one.
  Mobile nav here is a header icon row (see Layout below), never a rail.
- **Lorem-ipsum or placeholder-shaped copy.** If a string is visible in
  a component, it's either real copy or a clearly-fake test value you
  wrote on purpose for a specific reason — never generic filler.

## Color palette — use only these

Defined in `src/app/globals.css`. Don't introduce a new color without
adding it here first.

| Token | Hex | Use for |
|---|---|---|
| `brand-navy` | `#0f172a` | Dark screen backgrounds of the **tech and customer apps**; the dark phone mockups shown inside the owner dashboard. On the owner dashboard, used only for the footer |
| `brand-page` | `#eef3fb` | **Owner dashboard** page background — pale blue, with white cards on top |
| `brand-blue` | `#2563eb` | **Primary color of the owner dashboard**: active nav pill, primary buttons, links, focus rings. Secondary actions/links on the dark apps |
| `brand-blue-dark` | `#1d4ed8` | Deep end of the blue gradients (welcome banner, primary button) |
| `brand-sky` | `#0ea5e9` | Bright end of the blue gradients |
| `brand-orange` | `#f97316` | Accent — stat-card icon chip, "attention" badges. Primary CTA color on the dark tech/customer apps |
| `brand-orange-dark` | `#ea580c` | Orange **text** on light surfaces; paired with orange/amber in the dark apps' primary-CTA gradient |
| `brand-emerald` | `#10b981` | Success, completion, positive stats (fills, chips, icon backgrounds) — never for a primary CTA |
| `brand-emerald-dark` | `#059669` | Emerald **text and small icons** on light surfaces (plain `brand-emerald` is too pale to read there) |
| `brand-slate` / `brand-slate-light` | `#f1f5f9` / `#ffffff` | Light-theme surfaces (customer-facing marketing/site pages) |

No purple, violet, indigo, or pink anywhere in this app's palette. If a
design needs another accent color, ask before adding one — it almost
always means reaching for an emerald/blue/orange combination that already
exists.

## Owner dashboard: light theme rules

The owner dashboard (`/dashboard/**`, including Business Settings and the
website editor) is a **light, blue-primary** surface — pale blue page,
white cards, one bright blue for everything interactive. This replaces
the old dark navy dashboard; the tech and customer apps stay dark. When
you touch a dashboard screen, use these rules and nothing else:

| Thing | Rule |
|---|---|
| Page background | `bg-brand-page` (never `bg-brand-navy`) |
| Card / panel / modal / dropdown | `bg-white`, `rounded-2xl`, `border border-slate-200/70` (modals: `border-slate-200`), `shadow-sm shadow-slate-900/5` (modals: `shadow-2xl shadow-slate-900/10`) |
| Inner tile / recessed row (inside a card) | `bg-slate-50` |
| Text input / select / textarea | `bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none`, plus `[color-scheme:light]` on date/time/select |
| Heading text | `text-slate-900` |
| Body text | `text-slate-600` |
| Label / eyebrow / description | `text-slate-500` (eyebrows also `uppercase tracking-wide text-xs font-semibold`) |
| Placeholder / faint metadata | `text-slate-400` |
| Dividers and outlines | `border-slate-200`; outline buttons `border-slate-300` → hover `border-slate-400` |
| Primary button | `rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark text-white` with the blue glow shadow. One per screen area |
| Secondary button | outline: `border border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900` |
| Active nav item / active tab | solid `bg-brand-blue text-white shadow-md shadow-brand-blue/25` |
| Inactive nav item | `text-slate-600 hover:bg-slate-50 hover:text-slate-900` |
| Welcome / hero banner | `bg-gradient-to-r from-brand-blue-dark via-brand-blue to-brand-sky text-white`, `rounded-3xl`; buttons inside are white with `text-brand-blue-dark` |
| Stat card | white card, label + big number on the left, solid **circular** icon chip on the right (`h-11 w-11 rounded-full`, white icon) in blue / emerald / amber / orange |
| Status pill | tinted fill + darker text, e.g. `bg-brand-emerald/15 text-brand-emerald-dark`, `bg-brand-orange/10 text-brand-orange-dark`, `bg-brand-blue/15 text-brand-blue` |
| Warning / attention panel | `border-amber-200 bg-amber-50` (solid tints — translucent tints look muddy over the pale page) |
| Error / danger | `text-red-600`, `border-red-500/30 bg-red-500/10`; unread/alert rows `bg-red-50` |
| Modal overlay | `bg-slate-900/40` |
| Job board | One white container (`JobMasterTable`, `rounded-3xl border-slate-200`) holding every job as a row — never side-by-side columns, which overflow next to the docked map. Filter tabs across the top: All Jobs, Pending (booking requests, needs technician, technician not yet confirmed), In Progress (technician preparing, en route, on site or working), Disputed, Completed (completed + approved). Cancelled/declined jobs show only under All Jobs. Tab = pill with a count; the open tab is solid blue with white text; a pulsing red dot on an unopened tab means a job in it is waiting on the owner. The open tab is owned by the dashboard page so the booking popup and notifications can jump to Pending. Rows are sorted emergencies first, then jobs waiting on the owner, then newest; 25 show at a time with a "Show more" button. The list re-reads itself every ~8 seconds (`useJobTickets`), so a technician's update appears without a reload |
| Job row | `JobRow`: a 4px left bar in the stage tone (red for emergencies), then — laid out with **container queries** (`@container` on the table; stacked below `@5xl`, three aligned columns from `@5xl`), never viewport breakpoints, so it never scrolls sideways: (1) `#JOB-0007 - Service Title` (the ticket number comes from `formatJobNumber()` in `lib/jobNumber.ts` — the one place that decides how it is written, so the owner's table, the technician's app, the customer's app and every receipt agree), 🚨 EMERGENCY pill, customer name, address; (2) technician badge `Juan - En Route` (white pill, status dot in the stage tone) or the "Assign Tech..." dropdown for unassigned jobs, then the stage badge, `GPS Verified` when the arrival was GPS-checked, and how long it has been that way; (3) actions: Accept/Reject (booking requests), View Proof Pack (only when there are photos; primary blue for Completed/Disputed, view-only otherwise), Manage Job (expands the details, payment and invoice actions under the row) and Call Customer (`tel:`, disabled with no number). Status wording and colours come from `describeJob()` in `lib/dashboard/jobStatus.ts` — yellow = preparing/en route/waiting on the customer, green = on site or working, red = disputed, blue = completed/paid, orange = needs the owner, slate = cancelled. Change them there, never per row. Use `formatDateOnly` for `date` columns — `new Date("YYYY-MM-DD")` shows the previous day in US time zones |
| Live Field Map | Not a tab: a docked panel on the right of every dashboard tab (`xl:w-[360px] 2xl:w-[420px]`, sticky, full viewport height), dropping under the content below `xl`. It has a hide button that collapses it to a slim rail so the job board can use the full width; the choice is remembered in localStorage |
| Booking alert popup | `BookingAlertHost` (mounted once in the dashboard) polls every 10s and pops one `BookingAlertCard` per unanswered booking request, top-right, stacked (3 max, then a "+N more" pill). Ordinary bookings: white card, orange-tinted header, bell icon, "View Request". Emergencies: red border and glow, solid red header with white text (allowed on a colored surface), siren icon, "🚨 URGENT BOOKING", "Respond Now". A popup leaves when the request is accepted/rejected on the board or dismissed. Ordinary bookings ring three times; emergencies ring until answered; "Silence" stops the ring. Tones are synthesized in `lib/dashboard/ringtones.ts` (no audio files). Owners pick a tone for each kind, the volume and sound on/off in Settings → Booking Alerts, stored per device in localStorage (`bookingAlertPrefs.ts`); Settings previews the same `BookingAlertCard`. Browsers block sound until the first click, so the popup shows a hint when audio is blocked |
| Customize Mobile App / App Builder | The dashboard tab only holds the app download links and a card that opens the **App Builder** (`/dashboard/mobile-app`), a full-screen page laid out like the website builder (`/dashboard/website`): header with Back, title, Reset, Save and "Open Tech App"; a 400px form column on the left, a live preview on the right. The form has four sections — Branding & Media (logo upload, Light / Dark / Auto theme, Primary and Accent color, font), App Information (welcome message, announcement, office phone, reminder on every job), Workflow & Security Protocols (photos, live camera, signature, geofence Strict 50 m / Standard 100 m / Off) and Permissions & Privacy (show prices, on-site quote additions) — each a `SettingRow` with a `ToggleSwitch` or dropdown. The preview is **the real technician screens** (`TechHomeScreen`, `TechJobScreen`, `TechBottomNav`) with sample jobs, each laid out at 390px and scaled into a phone frame, fed the form's *unsaved* values (`TechAppPreview.tsx`). Never redraw the app by hand for a preview: pass the real components a `preview` prop (no polling, no sound, nothing live) and an `inert` wrapper. Hidden prices and additions are enforced in the app screens, not the database, so a determined technician could still read the data |
| Long explanatory copy | Never a paragraph under a section title. Keep one short line visible and put the rest behind a `HelpTip` (?) next to the title |
| Footer (`DashboardFooter`) | The one dark block on the dashboard: full-width `bg-brand-navy`, brand mark + tagline on the left, three link columns (Dashboard, Your Business, Contact), and a `border-t border-white/10` bar with legal links and the copyright. Headings `text-white`, links `text-slate-400 hover:text-white`. Only real links and the real support email — no placeholder socials or invented contact details |
| Text on a colored surface | stays `text-white` (gradient buttons, blue/red/emerald chips, banners, and captions over photos). White text is **only** allowed on those (and on the navy footer) — never on a white or pale surface |

Never use `bg-white/5`, `bg-white/10`, `border-white/10`, `text-slate-300`, or
a bare `text-white` on a dashboard screen — those are the dark-theme
classes and will be invisible on white. If a component is shared with the
dark apps, give it a `theme`/`tone` prop instead of hardcoding one surface
(see `SelectedProductsPicker` and `LocationPickerMap`).

The dark phone mockups inside the dashboard (Customize Mobile App and
Promotions previews) depict the real tech/customer apps, so they stay dark
on purpose — keep them inside their `PhoneFrame`.

## Typography

Font is Geist Sans (`--font-geist-sans`, already wired through
`globals.css` — never import Inter, Roboto, or any other "default AI
template" font). The established type scale, used consistently:

- Page/section heading: `text-lg font-bold text-white` (dark) or
  `text-slate-900` (light)
- Eyebrow / section label: `text-xs font-semibold uppercase tracking-wide
  text-slate-400/500`
- Body: `text-sm text-slate-300` (dark) / `text-slate-600` (light)
- Micro / metadata: `text-[10px]`–`text-xs text-slate-500`

## Touch targets

Every tappable element on a phone screen needs a real hit area of at
least 44×44px (iOS/Android HIG minimum) — a `p-2` icon button with an
`h-5 w-5` icon already clears this because the padding counts, but a bare
small icon or a thin text link with no padding doesn't. Check this
specifically for anything added to a header icon row or a dense list row.

## Layout

- Every screen is mobile-first. Design and review at **phone width first**
  (~390–430px), not desktop — this app is viewed in a browser on a phone
  or wrapped in a native WebView, full stop. The one exception is the
  **owner dashboard**, which is desktop-first: its left sidebar card shows
  only from `lg` up and collapses to a horizontally scrolling pill row on
  phones, so it never costs a phone screen permanent chrome.
- Single-column content wrapper: `mx-auto max-w-lg`, with `px-5 py-6` page
  padding. This is the pattern in `CustomerHomeScreen.tsx` and (as of the
  Sept 2026 fix) `TechHomeScreen.tsx` — reuse it, don't reinvent a wrapper.
- **Header pattern** (customer + tech apps): eyebrow badge + heading on
  the left, a row of icon buttons on the right (Messages, Notifications,
  Settings/Sign Out as applicable). No sidebar, no bottom tab bar unless
  explicitly asked for.
- Notification/dropdown menus anchor **below and right-aligned to their
  trigger icon** (`absolute right-0 mt-2 ...`), matching
  `CustomerNotificationBell.tsx`. Never a sideways flyout.
- Sub-screens (job detail, messages thread, settings) get their own
  `← Back` header — don't nest them inside the home screen's chrome.

### Owner dashboard and shop website on a phone

Owners run their business from a phone, so the dashboard, its sub-pages and
the public shop site (`/site/[slug]`) must be checked at 390px too — no
sideways page scroll, nothing cut off, nothing that needs a mouse. The rules
that make it work:

- **Page padding** shrinks on phones: `px-4 py-4 sm:px-6 sm:py-10 lg:px-8`.
  Header buttons stay on one line (`whitespace-nowrap`; "Business Settings"
  shortens to "Settings" below `sm`).
- **Section tabs** (dashboard, Settings) are one horizontally scrolling pill
  strip. The dashboard's strip is `sticky top-0 z-30` and scrolls the open tab
  to the centre, so it is always reachable and never half off-screen.
- **Wide tables become cards.** A table that needs more than ~600px (Staff)
  renders one card per row and keeps every action button visible. Switch with
  container queries (`@container` on the block, `@3xl:` on the table) — not
  `md:` — because the live-map column changes how much room the block really has.
- **Master/detail on phones.** Two-pane screens (Messages) show the list *or*
  the open chat, with a `← All conversations` link; side by side from `lg`.
- **Builder pages** (App Builder, Website Builder) are full-screen `h-dvh`
  editors. On a phone an `Edit | Live Preview` switch
  (`BuilderPaneToggle.tsx`) shows one pane at a time; from `md` both sit side by
  side. Save / error messages sit under the header so they show in both panes.
- **Modals** are `max-h-[90vh] overflow-y-auto` with `px-4` side margin, so a tall
  form can always be scrolled to its submit button. Two-column field pairs
  stack (`grid-cols-1 sm:grid-cols-2`) when the fields hold names, emails or
  free text; short numeric pairs may stay side by side.
- **Dropdowns** hang from the trigger's right edge on wide screens
  (`sm:right-0`) but from its left edge on phones (`left-0 max-w-[calc(100vw-3rem)]`)
  when the trigger sits at the left of a wrapped row (the notification bell).
- **Leaflet maps** live inside an `isolate` container so their high z-indexes can
  never paint over the sticky tab strip.
- **Shop website**: shop name may wrap to two lines (never `truncate`), and
  icons next to wrapping text are `shrink-0`.

## Components

- **Primary CTA button (tech and customer apps)**: `rounded-full bg-gradient-to-r from-amber-400
  to-brand-orange-dark px-6 py-3.5 text-sm font-bold text-white
  shadow-[0_0_20px_rgba(249,115,22,0.35)]` — one specific gradient, used
  everywhere a primary action lives. Don't invent a new gradient per
  screen. (The owner dashboard's primary button is the blue gradient in
  "Owner dashboard: light theme rules" above.)
- **Secondary/info button (dark apps)**: blue gradient (`from-brand-sky to-brand-blue-dark`)
  or a plain `border border-white/20` outline button — never a second
  orange button competing with the primary one on the same screen.
- **Card (dark apps)**: `rounded-2xl bg-white/5 p-4` (or `p-5`) on dark backgrounds.
  Flat, no border, no shadow — the CTA glow is what should stand out, not
  the container. Owner dashboard cards are white with a hairline border
  instead (see the light-theme rules above).
- **Customer home order**: header, search, live status banner, "My Service Bookings", then the quick categories, promotions, nearby services and the booking-code box. The banner (`LiveStatusBanner`) is the one thing happening right now in plain words ("Juan is on the way — ETA about 8 mins"), coloured by urgency, with a Track Technician button that opens a live map (`TechTrackerMap`). "My Service Bookings" (`ServiceBookingsHub`) is four tiles with counters — Pending Approval, Tech En Route, In Progress, To Review / Complete — like the order tabs of an online shop; tapping one lists its bookings as order cards (job number, status chip, 4-segment tracker, one action). Cancelled, declined and month-old approved jobs sit under "Show past bookings". Wording and stages come from `lib/customer/jobStages.ts`, which reads the same ticket fields as the owner's `describeJob`, so the owner, the technician and the customer always agree. The ETA is a rough straight-line estimate padded for roads and is dropped when the technician's position is older than 3 minutes; the page re-reads bookings every ~8 seconds.
- **Technician progress**: SCHEDULED is split by timestamps, not new statuses — not confirmed (`staff_accepted_at` empty), preparing (confirmed), en route (`en_route_at`, set by the technician's "I'm On My Way" or Start Navigation via `technician_mark_en_route`), then on site (ESTIMATE_PENDING) and working (IN_PROGRESS). Re-assigning a job clears `en_route_at`.
- **Payments and the signature unlock**: customers pay the shop directly (no payment gateway). The owner enters the bank account, PayPal email, QR code and instructions in Business Settings → Receiving Payments (`business_settings`, owners/managers only). The customer's job page shows them (`get_ticket_payment_info`, only once the job is under way) with copy buttons and an "Upload Payment Proof / Screenshot" button (`payment-receipts` bucket, gallery allowed). Uploading proof on a job that is in progress or finished sets `job_tickets.payment_status` to PAID by a database trigger — no owner step — and the technician's job screen, listening over Realtime, immediately shows "Payment received" and the signature pad; signing completes the job and offers "Proceed to Next Job". Cash claims ("Confirm I've Paid") still go to the owner to confirm, which also sets PAID. The owner keeps a way back: "Proof looks wrong — mark unpaid" in Manage Job re-locks the signature step and asks the customer for a new proof. Every switch to PAID or UNPAID is written to the job's activity log. `payment_status` is the only thing screens should read for "is it paid".
- **Live updates**: `subscribeToJobTickets()` (`lib/realtime/jobTicketChanges.ts`) listens to `job_tickets` changes for the owner's list (by shop), the customer's bookings (by email), the technician's home (by technician, main tabs only) and a technician's open job (by ticket). Row Level Security decides who hears what. Every one of those screens also keeps a slow poll, so a dropped connection only costs a few seconds. Anonymous visitors of a client link (no login) only get the poll.
- **Shop-controlled behaviour and theme** (`shops` columns set in Customize Mobile App): `TechJobScreen` reads `require_before_after_photos` (off: the photo is optional, and where the geofence is on a "Check My Location" button supplies the GPS reading instead), `mandatory_live_camera` (adds `capture="environment"` to the file input), `require_customer_signature`, `geofence_enforced` + `geofence_radius_meters`, `show_job_prices_to_techs` (hides every amount: estimate totals, receipt, payment amount, part prices, job history) and `allow_onsite_quote_additions` (hides labor and the parts picker; the technician sends the standard estimate). The owner's proof drawer and map respect the same switches. Defaults equal the old behaviour, so nothing changes until an owner flips a switch.
- **Light theme for the technician app and the client job page**: `mobile_app_theme` is `light`, `dark` (default) or `auto` (follows the phone). `useAppTheme()` sets `data-app-theme` on `<html>` and removes it when the screen unmounts; the Light look is one override layer at the bottom of `globals.css` that repaints the existing dark-first classes (`bg-brand-navy`, `bg-white/5`, `text-white`, `text-slate-400`...) — text on a gradient or solid brand colour stays white. Write new tech/customer screens with the same dark-first classes and they get Light for free; never add per-screen light styles. The customer's home, discovery and booking screens span many shops, so they stay dark.
- **Shop colours, font and information in the technician app**: the app is built from fixed colour tokens (`brand-orange` for the main actions, `brand-blue` for navigation and links). A shop's Primary and Accent colours repoint those tokens (`lib/branding.ts` → `brandVars`, applied to `<html>` by `useAppBranding` and to a preview phone by `brandStyle`), so every screen follows and nothing about how the app works changes. A chosen colour is first nudged to a readable lightness with its hue kept, because an owner can pick one that would vanish on the background. The untouched defaults (`#0F172A` / `#10B981`) and the font "Inter" mean "not chosen" and leave the app's normal look. Screens must use the tokens (`bg-brand-orange`, `text-brand-blue`...), never hard-coded orange or blue, or they won't follow. The owner's own words come from `shops.mobile_app_*` and are drawn by `ShopInfoCards.tsx` (home: welcome, announcement, call-the-office; job: reminder) — blank means the card isn't drawn. The customer's home and job page are not branded this way (they span many shops); the job page follows only the Light / Dark theme.
- **Badge/pill**: `rounded-full px-2.5 py-1 text-[10px] font-bold` with a
  color-matched `/15` background tint (e.g. `bg-brand-emerald/15
  text-brand-emerald`).
- **Empty state**: centered icon in a soft circle (`h-12 w-12
  rounded-full bg-white/10`) + one short sentence. Not a full illustration,
  not three paragraphs explaining the empty state.

## Copy voice

Specific, short, second person, no marketing tone. Say what will actually
happen ("Sign in to see your jobs and book new ones") not what the product
generally does ("ShopPulse helps you manage your business"). If a string
could be pasted into a generic SaaS landing page unchanged, rewrite it.

All product UI text is English only — no Tagalog or bilingual labels, even
if a shared mockup or reference image shows Tagalog. The target market is
US-based. This applies to every surface: staff app, customer app, owner
dashboard, booking link.

## Before calling a screen done

1. Find the closest existing screen doing something similar and match its
   patterns first — don't design from a blank slate when a reference
   already exists in this codebase.
2. Actually view it at phone width — in the emulator/WebView if it's a
   flow real users will hit there, not just a resized desktop browser.
3. Re-read this file's "telltale AI-generated signs" list against what you
   just built.
