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
| Job board | Five filter tabs, one shown at a time: All, Pending (booking requests + unassigned + scheduled), In Progress (awaiting quote approval + in progress), Completed (completed + approved), Flagged (disputed + cancelled). Each tab is a pill (dot + label + tinted count) and only the selected tab's cards show below in an auto-fill grid (`grid-cols-[repeat(auto-fill,minmax(300px,1fr))]`), under a white header card with a 3px colored top border, a one-line hint and small colored chips counting the exact stages inside ("2 Booking Requests · 1 Scheduled"). The selected tab is solid blue with white text; it defaults to the tab that most needs the owner. A pulsing red dot on an unselected tab means a job in it is waiting on the owner (new request, unassigned, needs review, disputed). Tab + stage config lives in `stages.ts` (`FILTERS` for the tabs, `STAGES` for the fine stages). Stage colors: Booking Requests and Unassigned orange, Scheduled sky, Awaiting Quote Approval deep blue, In Progress blue, Completed emerald, Disputed red, Approved dark emerald, Cancelled slate. Stage changes come from the card actions, not drag-and-drop |
| Job card | Every card uses the shared `JobCardShell` frame: a plain white `rounded-2xl` card (`border-slate-200/70`, `overflow-hidden`) with a header band tinted in the job's stage color (`stage.header` in `stages.ts`) holding a white initials avatar, client name, service and a white stage pill (`stage.tint` text). Emergency jobs add a solid red strip on top (white text) and a red border. Under the header: a `JobProgress` bar (7 segments in the stage color + "Step N of 7"; cancelled jobs have none), then icon rows (address, preferred date, technician chip, time in stage via `timeAgo`), an invoice tile and the stage-specific actions — COMPLETED gets a primary "Review & Approve" button, DISPUTED an outline "View Proof Pack". Never restyle a card on its own: change the shell or the stage config so all stages stay uniform. Use `formatDateOnly` for `date` columns — `new Date("YYYY-MM-DD")` shows the previous day in US time zones |
| Live Field Map | Not a tab: a docked panel on the right of every dashboard tab (`xl:w-[360px] 2xl:w-[420px]`, sticky, full viewport height), dropping under the content below `xl`. It has a hide button that collapses it to a slim rail so the job board can use the full width; the choice is remembered in localStorage |
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
