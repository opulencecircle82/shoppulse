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
| Job row | `JobRow`: a 4px left bar in the stage tone (red for emergencies), then — laid out with **container queries** (`@container` on the table; stacked below `@5xl`, three aligned columns from `@5xl`), never viewport breakpoints, so it never scrolls sideways: (1) `#JOB-0007 - Service Title` (the ticket number comes from `formatJobNumber()` in `lib/jobNumber.ts` — the one place that decides how it is written, so the owner's table, the technician's app, the customer's app and every receipt agree), 🚨 EMERGENCY pill, customer name, address; (2) technician badge `Juan - En Route` (white pill, status dot in the stage tone) or the "Assign Tech..." dropdown for unassigned jobs, then the stage badge, `GPS Verified` when the arrival was GPS-checked, and how long it has been that way; (3) actions: Accept/Reject (booking requests), View Proof Pack (only when there are photos; primary blue for Completed/Disputed, view-only otherwise), Manage Job (expands the details, payment and invoice actions under the row), Message (opens the owner's chat with that customer in the Messages tab in one tap — `openCustomerChatForEmail()` in `lib/chat/chat.ts` matches the customer by email and creates the chat if needed; a customer without a ShopPulse account gets a short inline note pointing to Call Customer instead) and Call Customer (`tel:`, disabled with no number). Status wording and colours come from `describeJob()` in `lib/dashboard/jobStatus.ts` — yellow = preparing/en route/waiting on the customer, green = on site or working, red = disputed, blue = completed/paid, orange = needs the owner, slate = cancelled. Change them there, never per row. Use `formatDateOnly` for `date` columns — `new Date("YYYY-MM-DD")` shows the previous day in US time zones |
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
- **Customer home order**: header, search, live status banner, "My Service Bookings", then the quick categories, promotions, nearby services and the booking-code box. The banner (`LiveStatusBanner`) is the one thing happening right now in plain words ("Juan is on the way — ETA about 8 mins"), coloured by urgency, with a Track Technician button that opens a live map (`TechTrackerMap`). "My Service Bookings" (`ServiceBookingsHub`) is four tiles with counters — Pending Approval, Tech En Route, In Progress, To Review / Complete — like the order tabs of an online shop; tapping one lists its bookings as order cards (job number, status chip, 4-segment tracker, one action). Cancelled, declined and month-old approved jobs sit under "Show past bookings" — and so does a finished job the customer has already rated **and** paid (`customer_reviewed_at`, set by a trigger on `shop_reviews`, is what says so), so the To Review / Complete counter only ever counts what still needs them; a rated job that is still unpaid, and a disputed one, stay. The top banner follows the same rule and says only what is left ("Review the proof and rate the service" / "…and pay for the service" / both). Wording and stages come from `lib/customer/jobStages.ts`, which reads the same ticket fields as the owner's `describeJob`, so the owner, the technician and the customer always agree. The ETA is a rough straight-line estimate padded for roads and is dropped when the technician's position is older than 3 minutes; the page re-reads bookings every ~8 seconds.
- **Technician progress**: SCHEDULED is split by timestamps, not new statuses — not confirmed (`staff_accepted_at` empty), preparing (confirmed), en route (`en_route_at`, set by the technician's "I'm On My Way" or Start Navigation via `technician_mark_en_route`), then on site (ESTIMATE_PENDING) and working (IN_PROGRESS). Re-assigning a job clears `en_route_at`.
- **Payments and the signature unlock**: customers pay the shop directly (no payment gateway). The owner enters the bank account, PayPal email, QR code and instructions in Business Settings → Receiving Payments (`business_settings`, owners/managers only). The customer's job page shows them (`get_ticket_payment_info`, only once the job is under way) with copy buttons and an "Upload Payment Proof / Screenshot" button (`payment-receipts` bucket, gallery allowed). Uploading proof on a job that is in progress or finished sets `job_tickets.payment_status` to PAID by a database trigger — no owner step — and the technician's job screen, listening over Realtime, immediately shows "Payment received" and the signature pad; signing completes the job and offers "Proceed to Next Job". Cash claims ("Confirm I've Paid") still go to the owner to confirm, which also sets PAID. The owner keeps a way back: "Proof looks wrong — mark unpaid" in Manage Job re-locks the signature step and asks the customer for a new proof. Every switch to PAID or UNPAID is written to the job's activity log. `payment_status` is the only thing screens should read for "is it paid".
- **Live updates**: `subscribeToJobTickets()` (`lib/realtime/jobTicketChanges.ts`) listens to `job_tickets` changes for the owner's list (by shop), the customer's bookings (by email), the technician's home (by technician, main tabs only) and a technician's open job (by ticket). Row Level Security decides who hears what. Every one of those screens also keeps a slow poll, so a dropped connection only costs a few seconds. Anonymous visitors of a client link (no login) only get the poll.
- **Technician home: one button at a time.** The active-task card never shows a pile of buttons. Before leaving it is a single green **I'm On My Way** (an `<a>` to Google Maps, so one tap sets off and opens the route): it records `en_route_at` (`technician_mark_en_route`), clocks the technician in if they aren't already (the technician's time starts; `clock_in` keeps a running clock running) and, because the app shares the technician's position, the owner's Live Field Map and the customer's tracker follow the trip. Once en route the same slot becomes **I've Arrived — Start Job** (the proof step: geofence check, live photo, checklist), with a small "Open navigation again" link under it; then Continue Job / Complete Job. A technician already on site can use the quiet "Already at the customer's place? Start the job" link. The customer is not billed for travel: the job's billable clock (`started_at`) still starts on arrival.
- **Emergency jobs nearby.** When a customer books an emergency with a map pin, every online technician within 5 km gets a notification *and* an **Emergency Jobs Nearby** card at the top of their home screen (`list_nearby_emergency_jobs`, needs the technician's own position from the last 15 minutes) with **Claim This Job**. The card stays until a technician is on the job: it is listed while the request is `PENDING` **and** after the owner has accepted it but not yet assigned anyone (`UNASSIGNED`); `technician_claim_emergency_job` accepts both. (It used to list `PENDING` only, so the moment the owner tapped Accept the job disappeared from every technician's screen and survived only as an old notification.) Tapping that notification scrolls to the card. While the technician is still working a job of their own the card's button reads **Finish #JOB-0001 to claim** and is disabled.
- **Setup requires an address, a pin and working hours.** Company Profile will not save without a business address **and** a pin on the map (creating a shop needs the pin too — the map is on the create form, and the pin is written right after `create_shop_and_owner`, which doesn't take one). The setup steps are Company Profile → **Working Hours** → Geofence → Staff → Branding; while setting up, the later steps are locked until the current one is done, and Working Hours is a real step ("Save & Continue"). A shop that already exists without hours gets an amber "Set working hours" banner at the top of Settings until it has them (the Home checklist and the LIVE button ask too). Saving hours also saves the device's timezone (`lib/shopTimezone.ts`) — "closed right now" is measured in it.
- **Night shift (after-hours emergencies).** Settings → **Night Shift** (owners only). The owner turns on `shops.night_shift_enabled` (needs working hours: the "night" is simply whenever the shop is closed — outside its working days/hours in its own timezone, `shop_is_closed_now()`) and puts technicians on call (`staff_members.is_night_shift`, changeable only by an owner or manager; a technician's own update is refused by RLS). When a customer sends an emergency while the shop is closed and night shift is on, `submit_job_booking` records it as `job_tickets.after_hours = true` (only the database can set that flag — `trg_protect_after_hours`), tells the owner ("After-hours emergency … your night shift has been alerted", or "nobody is on your night shift, so please assign someone") and alerts **every active night-shift technician wherever they are** (no 5 km or online rule; each alert is logged in `night_shift_alerts`). Day technicians aren't alerted and can't claim it while the shop is closed (`technician_claim_emergency_job` → "only the technician on night shift can take it"). A night-shift technician sees it in the emergency list with no location needed (`list_nearby_emergency_jobs` returns `after_hours` and a nullable `distance_km`) and claims it directly — **no owner approval**; the claim marks their alert answered, tells the owner ("Night shift took an emergency") and, because the job is no longer `PENDING`, stops the owner's ringing alert. The owner's log (`get_night_shift_report`, last 30 days) shows every one as ACCEPTED (by whom, how fast) / WAITING (first 10 minutes) / MISSED (nobody on night shift took it) / CANCELLED, plus per technician "Alerted n · accepted n · missed n" with **Remove from night shift** and **Add to night shift** so a technician who never answers can be replaced. Job rows carry a NIGHT SHIFT pill and a line saying who accepted it; the technician app shows a Night Shift chip, a short explainer card and the same pill; the customer's booking page says the night-shift technician will be alerted when the shop is closed. Night-shift chips use `brand-blue` / `brand-sky` (never indigo or purple) and the `Moon` icon — no moon emoji in titles or copy.
- **Job photos: light on the server, address + fingerprint forever.** Photos are shrunk on the phone before upload (`compressImage()` in `lib/shared/imageCompress.ts`; proof photos in `renderWatermarkedPhoto` — longest side 1024 px, JPEG 0.68, so a multi-megabyte camera photo becomes ~90 KB and is quick to send on a weak signal; receipts keep 1280 px / 0.75 because they are text). Every job photo — start proof, completion proof, the customer's request photo and payment receipt — gets a row in `job_photos` (registered automatically by a trigger on `job_tickets`): its **address** (`PH-7K3Q9X2M`, unique, easy to read out) and its **fingerprint** (SHA-256 of the exact bytes; proof photos get it at capture, the others just before removal). The file itself leaves the server 60 days after an approved job's warranty is over (30 days after a cancelled or declined one; disputed and open jobs are never touched): the daily job `/api/cron/purge-photos` (vercel.json cron, service role) fingerprints the stored bytes, deletes the file from storage and only then calls `mark_photo_purged`, which keeps the code and fingerprint, takes the dead link off the job (the job keeps its fingerprint too) and writes "Photo PH-… was removed from the server to save space" into the job's activity log. If the stored bytes no longer matched the capture fingerprint, the photo is flagged (`sha256_mismatch`) and the Proof Pack says so. In the owner's Proof & Dispute Review each photo shows its Photo ID and fingerprint, **Save a copy** (downloads it) and **Check a copy** (pick any file — it says whether it is byte-for-byte the original), and a removed photo shows when it was removed. The customer's page shows only the completion proof and never offers a download link (in the customer app's WebView a link to an image would trap them on it). Logos, avatars, promo images, review photos and signatures are not part of this — they are small and belong to the shop's public face. Set a `CRON_SECRET` on Vercel to make the clean-up route refuse anyone but Vercel's own scheduler; without it the route is still harmless (it only removes what is already due).
- **Proof survives no signal (the outbox).** When a technician submits start or completion proof and the phone has no signal, `TechJobScreen` keeps everything on the phone (IndexedDB, `lib/tech/proofOutbox.ts`) — the watermarked photo and its fingerprint, GPS, geofence distance, signature and the real time it was taken — and says "Saved on your phone". `useProofOutbox` (mounted in `app/tech/page.tsx`) sends it by itself when the app opens, when the phone comes back online, when the app returns to the screen and every 20 seconds; the job's start/finish time is the moment it was taken, not the moment it was sent. The send is guarded (`onlyIfStatus`: a start proof only while the job is still SCHEDULED, a completion proof only while it is IN_PROGRESS), so an old proof can never push a cancelled or already-updated job backwards — it is dropped and the technician is told once. One waiting proof per job and stage; each belongs to the technician who took it (another sign-in on the same phone never sends it) and signing out warns if anything is still waiting. While it waits, the home card shows "Start proof saved on your phone" with a **Send now** button in place of the action button. Live camera still applies — nothing here accepts a gallery photo. It only runs while the app is open; sending with the app closed would need a native background service.
- **Review removal (the owner asks, the developer console decides).** Settings → **Review Removal** (owners only): the owner ticks the reviews they want gone (unfair, fake, not their customer), can say why, and sends a request (`request_review_deletion`; `list_reviews_for_moderation` supplies the ids). It waits 3 days (`review_deletion_requests.delete_after`). A review already in a waiting request can't be picked again, and the owner can cancel the request. In the developer console — the address is `/devside` (`/devsides` redirects there) — an account with a waiting request shows an amber "N review request" pill; its account window (`AccountDetailModal`) shows exactly what was asked and lets the developer **Remove now** or **Decline** (with a note the owner sees) through `admin_decide_review_deletion` (`POST /api/admin/review-requests/[id]`). If nobody acts, the hourly pg_cron job `review-deletions` (`process_review_deletions`) removes exactly the ticked reviews once the 3 days are up. The owner is notified either way; the request keeps a copy of each review (rating, comment, who wrote it) so the history stays readable, and a customer whose review was removed is not asked to rate that job again (`customer_reviewed_at` stays). The same account window shows the profile and owner, staff, customers (different people who have booked), jobs, reviews and their average, working hours, night shift and map pin (`GET /api/admin/shops/[id]/detail`, `admin_shop_overview`). ShopPulse has one location per account — there are no branches.
- **A busy technician can't be given another job.** "Busy" (`keepsTechnicianBusy()` in `lib/dashboard/techBusy.ts`) means on site or working (`ESTIMATE_PENDING` / `IN_PROGRESS`) or already on the way (`SCHEDULED` with `en_route_at`); jobs merely waiting in their queue don't count. The owner's **Assign Tech...** list and New Job Ticket's **Assign Technician** list show such a person greyed out as "Name — busy on #JOB-0001". The database enforces it too (`guard_busy_technician`, a trigger on `job_tickets.assigned_staff_id`: "That technician is still busy on job #JOB-0001. Finish it first, or choose another technician."), and the assign dialog now shows that message instead of closing as if it worked. A test account that needs a second technician gets one from the developer console (below).
- **Unlimited technician seats (test/demo accounts).** `shops.unlimited_tech_seats` switches off the paid-seat wording: Staff Management says "Unlimited tech seats (test account)" and Add Staff shows no $29 / $25-a-month acknowledgement. Only the developer console can change it (`PATCH /api/admin/shops/[id]` with `unlimitedTechSeats`, buttons in the account's View window; a database trigger, `protect_shop_admin_flags`, ignores any attempt by an owner to set it on their own shop). Seats are not otherwise limited anywhere in the database — this only removes the prompt.
- **Links that leave the technician app (Maps, `tel:`, `sms:`).** Inside the Android wrapper these must be handed to the phone's own app — the wrapper (v0.3.0+, `shoppulse-mobile`'s `_handleNavigationRequest` / `linkStaysInApp()`) does that, and announces it by setting `window.__shopPulseNativeLinks`. Older wrappers can't: following such a link there replaces the whole app with "Could not load ShopPulse — net::ERR_UNKNOWN_URL_SCHEME". So every such link in the technician screens carries `onClick={guardExternalLink}` (`lib/tech/externalLinks.ts`): in an older wrapper (bridge present, flag missing) it stops the click and shows the "Update the ShopPulse app" notice (`UpdateAppNotice`, mounted by `app/tech/layout.tsx`); in a normal browser or a new wrapper it does nothing. Any new external link in the technician app needs the same guard.
- **Customer request status.** After sending a booking, the confirmation screen offers **View My Request Status** (the new ticket's page) and **Message the Owner** (opens the customer's chat with the shop) — never a bare "View My Jobs". The ticket page (`/client/[ticketId]`) opens with a `RequestProgress` tracker from `requestProgress()` in `lib/customer/jobStages.ts`: Request sent → Shop confirmed → Technician assigned → Technician preparing → On the way, with the lit step worded as what is being waited on ("Waiting for the shop to confirm", "Waiting for a technician", "Waiting for the technician to confirm", "Technician is preparing"). It disappears once the technician is on site. `get_client_ticket` supplies `created_at` and `staff_accepted_at` for it. From the moment a technician confirms the job until it is finished the same page leads with a `TechLiveCard`: "Your technician is getting ready" before they set off, "The tech is on its way" with the ETA while they are on the road, and "Your technician is on site" (with what they are doing — diagnosing, quote ready, work in progress) once they arrive; under it the live map (the technician, the customer's address and the shop — all drawn even before the technician's app has shared a position) and a **Message us** button (the customer's chat with the shop; someone who only has the link is sent to sign in first) — and, once the technician is within `NEARBY_KM` (500 m) of the door with a fresh position, "The tech is almost near you". The database sends the matching bell notification once per job (`notify_customer_tech_nearby`, a trigger on `staff_live_locations`, which can never block a location save). The customer home banner no longer holds a map: its button ("Track Technician") opens that request page, and its headline switches to "almost there" at the same 500 m. `get_client_ticket` also returns `shop_slug` and the job's `booking_latitude/longitude` for this.
- **Cancelling and the Cancelled tab.** A customer can't cancel without saying why: the request page asks "Why are you cancelling?" (a reason list plus an optional note; "Other" needs a note) and `client_cancel_booking` refuses an empty reason. The reason is kept in `cancellation_reason`. The owner's Job Board has a sixth tab, **Cancelled**, holding cancelled requests and ones the shop declined, newest cancellation first (`jobFilterOf()` returns `CANCELLED` for both statuses). They are kept out of **All Jobs**, Home's pending/tomorrow lists and the technician's queue, so working lists only hold live work. Each cancelled row shows `Reason: …`, "The technician had already set off" when `en_route_at` was set, and "Call-out fee applies" when a fee was charged; Manage Job repeats it. A trigger (`notify_job_cancelled`) sends the owner a bell notification with the reason, and the assigned technician one too — "Job cancelled — no need to go" if they had already tapped I'm On My Way. A technician who had set off also sees a red "Job cancelled — no need to go" card on their home screen for 3 hours (`recentEnRouteCancellation()`); one who hadn't set off just sees the job leave their list.
- **Being found by nearby customers.** The customer home lists **Services Near You** (`list_nearby_shops`: every publicly listed shop with a pinned location within 20 km — `NEARBY_RADIUS_KM` in `CustomerHomeScreen.tsx` — nearest first, even with no services yet; the old separate "Businesses Near You" / "Services Near You" pair was one list twice, so there is now only this one). Above the list, one square per business category actually present nearby (`categoryIcon()` in `lib/location/categoryIcons.ts`, covering every category in `SERVICE_CATEGORY_GROUPS` — never a fixed row, so a category with nothing under it never shows) scrolls horizontally like the promotions strip above it; tapping one filters the list in place, tapping it again (or **All**) clears the filter — this replaced the old round "Quick Categories" shortcuts that navigated to a separate Discover search, which is now one screen fewer for the same job. A shop with no map pin, city, category or services can't appear by distance, so the owner's Home tab shows a `GetFoundChecklist` (amber card, only while something is missing) that names each gap and links to where it is fixed. A listed business with no map pin yet is still shown, marked "In your area", when its city matches the customer's city (or, with no city either, its region) — `list_nearby_shops` takes the customer's pin, city and region and returns pinned shops first (nearest first), then these. The list is a **2-column photo card grid**, open businesses first (a stable sort, so nearest-first still holds within each group): a 4:3 cover photo (the shop's own `website_header_url` when it has uploaded one, else a category stock photo from `stockPhotoForCategory()` — never blank), an **Open Now**/**Closed** chip top-right, and a category chip (icon + name) bottom-left — opposite corners on purpose, so a long category name can never run into the status chip. Below the photo: the shop name, its rating (or "No rating yet") and distance. A business with no working hours yet counts as Closed but still receives requests; a closed card keeps `ScheduleTomorrowLink` underneath.
- **Who is on which map.** Customer tracking map (`TechTrackerMap`): the technician (green engineer dot), the customer's own address (blue pin) and the shop (orange storefront pin, `public/images/shop-marker.svg`, from `get_client_ticket`'s `shop_latitude/longitude`), named in a legend under the map; the shop is kept in frame while the technician is getting ready, on the way or on site, and dropped from the framing only when the technician is on the road within 500 m of the door and the shop is more than 1 km from the address, so the map can zoom in. The legend also prints the shop's street address. The shop's name is the only label drawn on the map itself — the blue address pin has none (the legend names it; a label beside it used to sit on top of the shop's name when the two were close). The customer's request page shows only the **Job Completion Proof** (that is what they review and approve); the job-start proof photo is for the shop and the technician. Owner's Live Field Map: the shop (same storefront pin, always shown once it is pinned), **one pin per client per spot** (`buildMapPlaces()` in `lib/dashboard/mapPlaces.ts`, from `job_tickets_map_view`): the customer's booked address, falling back to where a technician took proof photos. Two jobs for the same client within 150 m share one pin — labelled with the most relevant job ("Client: Agnes · #JOB-0003 (+1 more)") and listing every job, its stage and its technician in the popup; a client with an open job gets the blue pin, one with only finished work the engineer-head pin, and a job that has proof photos also draws the green geofence ring. Cancelled and declined requests never get a pin. Plus the green live technician dots. Refreshed every 30 s. (Never pass `icon={undefined}` to a Leaflet `Marker` — it replaces the default icon with nothing and the map crashes; leave the prop off.)
- **The LIVE button.** Under the shop name in the owner dashboard header (`GoLiveButton`, owners only). A shop is LIVE when it is listed for customers (`is_publicly_listed`), has working days and hours (`hasWorkingSchedule()`) **and** has pinned where it is on the map (`hasBusinessLocation()`) — `isShopLive()`. Not live: a red **Go LIVE** button with a one-line reason. It walks the owner through what is missing, in order: **Please input your working days** (the same `WorkingHoursPanel` as Settings), then **Pin your business on the map** (`LocationPickerMap`: "Use my current location" or tap the map) — and the moment the last step is saved the listing turns on. If only the listing is off it turns it on directly. The Home checklist's "Set hours" / "Set location" open those same steps (`GO_LIVE_EVENT`). Live: a green **LIVE NOW** badge whose menu offers **Edit working days**, **Edit business location** and **Take offline**. The pin matters because the customer's tracking map and the owner's map both draw the shop from it; without one the customer's map says "The shop hasn't pinned its location yet". It refreshes the shop with `refresh({ quiet: true })` so the dashboard doesn't flash its loading spinner. `WorkingHoursPanel` now refuses zero days or a closing time that isn't after the opening time.
- **Live Field Map, before there is anything to show.** With no jobs or technicians it centres on the shop's own pin (with a "your business" marker above the empty-state card), else on the Philippines for a Philippine shop, else on the middle of the United States — never a random country for a local business.
- **Scheduling a request.** A Closed business card (home, Discover, shop page) carries **Click to schedule your request for tomorrow** (`ScheduleTomorrowLink`), which opens the booking form with `?schedule=1`: the day is preset to the next day the business works and a `TimeSlotPicker` offers hourly times (the shop's hours, or 8 AM-5 PM while it has none). `get_slot_availability` says which hours are held: a time is vacant while fewer requests than the shop has active technicians (at least one; pending requests count) hold it. A taken hour is crossed out and can't be chosen; **Try the next day →** moves to the next open day inside the 14-day booking window. In schedule mode a day and time are required; on a normal booking the time is optional. The chosen hour is stored as `job_tickets.preferred_time`, `submit_job_booking` refuses an hour that was just taken ("That time was just taken…"), and it shows as "Preferred: 9/30/2026 at 9:00 AM" on the owner's booking card, job details, alert popup and Home lists (`formatPreferred()`), and as "Scheduled for…" on the customer's confirmation and request page.
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
