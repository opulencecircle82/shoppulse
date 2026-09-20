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
  plain `bg-white/5` — the glow is what makes the real CTA findable.
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
| `brand-navy` | `#0f172a` | Dark screen backgrounds (tech/owner app), headings on light backgrounds |
| `brand-orange` | `#f97316` | Primary brand accent — badges, active nav state |
| `brand-orange-dark` | `#ea580c` | Paired with orange in the primary-CTA gradient |
| `brand-blue` | `#2563eb` | Links, secondary actions, "verified/info" accents |
| `brand-blue-dark` | `#1d4ed8` | Paired with sky/blue in secondary gradients |
| `brand-sky` | `#0ea5e9` | Paired with blue-dark in the secondary-CTA gradient |
| `brand-emerald` | `#10b981` | Success, completion, positive stats — never for a primary CTA |
| `brand-slate` / `brand-slate-light` | `#f1f5f9` / `#ffffff` | Light-theme surfaces (customer-facing marketing/site pages) |

No purple, violet, indigo, or pink anywhere in this app's palette. If a
design needs another accent color, ask before adding one — it almost
always means reaching for an emerald/blue/orange combination that already
exists.

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

## Layout

- Every screen is mobile-first. Design and review at **phone width first**
  (~390–430px), not desktop — this app is viewed in a browser on a phone
  or wrapped in a native WebView, full stop.
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

- **Primary CTA button**: `rounded-full bg-gradient-to-r from-amber-400
  to-brand-orange-dark px-6 py-3.5 text-sm font-bold text-white
  shadow-[0_0_20px_rgba(249,115,22,0.35)]` — one specific gradient, used
  everywhere a primary action lives. Don't invent a new gradient per
  screen.
- **Secondary/info button**: blue gradient (`from-brand-sky to-brand-blue-dark`)
  or a plain `border border-white/20` outline button — never a second
  orange button competing with the primary one on the same screen.
- **Card**: `rounded-2xl bg-white/5 p-4` (or `p-5`) on dark backgrounds.
  Flat, no border, no shadow — the CTA glow is what should stand out, not
  the container.
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

## Before calling a screen done

1. Find the closest existing screen doing something similar and match its
   patterns first — don't design from a blank slate when a reference
   already exists in this codebase.
2. Actually view it at phone width — in the emulator/WebView if it's a
   flow real users will hit there, not just a resized desktop browser.
3. Re-read this file's "telltale AI-generated signs" list against what you
   just built.
