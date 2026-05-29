# Sequoia OS — Frontend Architecture (v0.1, 2026)

> Production-grade Next.js 15 / React 19 frontend. Not a CRUD dashboard.
> Designed as an AI-native operations OS — keyboard-first, realtime-first,
> distinctive by design.

---

## 0. Aesthetic commitment

A frontend without a point-of-view is forgettable. Sequoia OS commits to one:

- **Instrument-panel × editorial.** The UI reads like mission-control had
  an editorial magazine layout drop in. Hairline 1px dividers, reticle
  corners, tabular numerics, ambient pulses — paired with an italic serif
  display face for headlines.
- **Anti-cliché palette.** Onyx base + **warm amber** (`#FFB347`) as the
  primary signal (instead of the overused cyan/electric-purple). Cold mint
  for healthy states, vermillion for critical. No purple gradients on white.
- **Type pairing**:
  - Display — **Instrument Serif** (italic for hero moments)
  - UI — **Geist** (modern technical sans)
  - Data — **JetBrains Mono** (tabular numerics, IDs, telemetry)

Bold maximalism would be wrong for an operator UI. We commit to **refined
density**: every pixel earns its place, but the surface stays calm.

---

## 1. Stack

| Concern              | Choice                               | Why                                                   |
|----------------------|--------------------------------------|-------------------------------------------------------|
| Meta-framework       | Next.js 15 (App Router + Turbopack)  | RSC, streaming, typed routes, edge-friendly           |
| Runtime              | React 19                             | New use() + transitions for live data                 |
| Styling              | Tailwind CSS 3.4 + CSS variables     | Token-first, theme-swappable, lossless to copy        |
| UI primitives        | Radix + shadcn-style locals          | Headless, accessible; we own the visual layer         |
| Motion               | `motion` (Framer) + raw CSS          | High-impact moments + cheap micro-interactions        |
| State (server)       | TanStack Query v5                    | Caching, retries, pagination, optimistic updates      |
| State (client)       | Zustand 5                            | Single store for realtime live state                  |
| Data viz             | Hand-rolled SVG primitives + `reactflow` (builder) | No chart library bloat for sparklines |
| Forms                | react-hook-form + zod                | Typed, zero-render-on-every-keystroke                 |
| Command palette      | `cmdk`                               | Keyboard-first, instant                              |
| Notifications        | `sonner`                             | Minimal, accessible                                  |
| Desktop              | Tauri 2 (Rust shell)                 | 8 MB binary vs Electron's 200 MB; native keyring     |
| Mobile               | Responsive web + Capacitor wrapper (future) | Same codebase                                  |
| Offline              | Service worker + IndexedDB persisted Query cache | PWA install + degraded-but-usable         |

---

## 2. Folder structure

```
web/
├── ARCHITECTURE.md / FRONTEND.md     ← this file
├── package.json
├── next.config.mjs                   ← exports an SPA bundle when SEQUOIA_DESKTOP=1
├── tailwind.config.ts                ← token aliases only; no design data lives here
├── components.json                   ← shadcn config (we use the convention, own the code)
├── tsconfig.json                     ← path aliases @/components, @/lib, @/hooks
├── public/
│   ├── manifest.webmanifest          ← PWA
│   ├── noise.svg                     ← decorative grain
│   └── fonts/                        ← optional self-hosted woff2 (production)
├── src-tauri/                        ← Tauri shell (Rust)
│   ├── tauri.conf.json
│   └── src/main.rs                   ← tray, keyring commands, deep-link wiring
├── src/
│   ├── app/                          ← Next.js App Router
│   │   ├── layout.tsx                ← font CSS vars + Providers + atmospheric backdrop
│   │   ├── providers.tsx             ← QueryClient, ThemeProvider, Realtime, Palette, Toaster
│   │   ├── globals.css               ← imports tokens + utility classes
│   │   ├── (auth)/login/page.tsx     ← editorial split-screen login
│   │   ├── (app)/                    ← authenticated shell route group
│   │   │   ├── layout.tsx            ← Sidebar + Topbar wrapper
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── devices/page.tsx
│   │   │   ├── devices/[id]/page.tsx
│   │   │   ├── ai/page.tsx
│   │   │   ├── workflows/page.tsx
│   │   │   ├── workflows/builder/[id]/page.tsx
│   │   │   ├── notifications/page.tsx
│   │   │   ├── users/page.tsx
│   │   │   └── settings/page.tsx
│   ├── components/
│   │   ├── primitives/               ← Button, Plate, Badge, Stat, Sparkline, SignalDot, Kbd
│   │   ├── shell/                    ← Sidebar, Topbar, CommandPalette
│   │   ├── widgets/                  ← AIAssistantPanel, ActivityFeed, FleetMap, AmbientPulse
│   │   ├── data/                     ← (extension point) charts, tables
│   │   ├── motion/                   ← (extension point) reusable motion wrappers
│   │   └── icons/                    ← (extension point) custom SVGs
│   ├── lib/
│   │   ├── api/                      ← typed `fetch` + TanStack hooks
│   │   ├── ws/                       ← RealtimeClient + RealtimeBoundary
│   │   ├── store/                    ← Zustand realtime store
│   │   ├── auth/                     ← (extension point) auth helpers
│   │   ├── theme/                    ← (extension point) theme switch
│   │   ├── tauri/bridge.ts           ← desktop bridge (no-op in browser)
│   │   └── utils.ts                  ← cn(), fmt(), fmtAgo(), fmtBytes()
│   ├── styles/
│   │   ├── tokens.css                ← THE DESIGN SYSTEM SOURCE OF TRUTH
│   │   └── fonts.ts                  ← next/font registrations
│   ├── types/
│   │   └── events.ts                 ← mirror of server Envelope/EventKind types
│   └── hooks/                        ← (extension point) shared hooks
```

---

## 3. Design system

### 3.1 Tokens — `src/styles/tokens.css`

All color, motion, type, radius live as CSS variables. Tailwind exposes them
through aliases (`bg-ink-50`, `text-ember`, etc) so we can swap themes or hand
a customer a per-tenant accent without rebuilding.

```css
:root {
  --ink:      8 9 12;          /* near-pure onyx */
  --ink-100: 15 17 22;         /* card */
  --ember:    255 179 71;      /* primary signal */
  --mint:     123 224 173;     /* healthy */
  --flame:    255 95 61;       /* critical */
  --steel:    107 138 168;     /* info */
  --hairline: 255 255 255;     /* used at low alpha */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
}
```

### 3.2 Primitives — `src/components/primitives/*`

| Primitive    | Purpose                                                          |
|--------------|------------------------------------------------------------------|
| `Button`     | CVA-typed variants: `ember`, `plate`, `outline`, `ghost`, `danger`, `link` × `xs|sm|md|lg|icon`. Press = 1px Y-translate, no scale. |
| `Plate`      | The canonical "card": hairline edge + optional reticle corners + composable `<PlateHeader>` / `<PlateTitle>` / `<PlateBody>` / `<PlateFooter>`. |
| `Badge`      | Mono caps, low-alpha background, hairline border. Tones: ember, mint, flame, steel, bone. |
| `Stat`       | Big italic serif numeric + small mono unit + delta + trend arrow. The signature display element. |
| `Sparkline`  | Featherweight inline SVG trend line. Zero deps. |
| `SignalDot`  | 6 px status pip with ambient pulse ring. |
| `Kbd`        | Bottom-shadowed keycap chip. |

### 3.3 Motion vocabulary

Three durations, two easings, used consistently:

- `--dur-quick (140ms)`  — hover/press feedback
- `--dur-base (240ms)`   — element transitions
- `--dur-slow (480ms)`   — page reveal staggers
- `--ease-out-expo`      — element entrances
- `--ease-in-expo`       — element exits

Used as utility class `fade-up` with `--d` CSS variable for stagger:

```tsx
<div className="fade-up" style={{ ['--d' as never]: '120ms' }} />
```

Ambient effects (slow): `live-dot`, `pulse-soft`, `scan-overlay` on hover,
`ember-flicker` for AI active signals. All CSS-only — no JS frame loops, no
GPU-locked canvases. **60 fps on integrated graphics.**

### 3.4 Accessibility baked in

- Every interactive element uses Radix or has explicit `aria-*` + focus rings.
- `prefers-reduced-motion`: globally throttles `animation-duration` & `transition-duration` to ~0.
- Color contrast: body text on the darkest surface = 12.4:1 (WCAG AAA).
- Keyboard: ⌘K palette, `g+<h|d|a|w>` route shortcuts, J/K table step.
- Focus order: respected; `tabIndex` never used to override DOM order.

---

## 4. App shell

### 4.1 Persistent chrome

```
┌──────────┬───────────────────────────────────────────────────┐
│          │  Topbar — breadcrumb · clock · ⌘K · Ask Sequoia   │
│ Sidebar  ├───────────────────────────────────────────────────┤
│ 220 px   │                                                   │
│ — nav    │                                                   │
│ — tenant │              main / page contents                 │
│ — sys    │                                                   │
│ status   │                                                   │
└──────────┴───────────────────────────────────────────────────┘
```

- **Sidebar**: nav grouped semantically (`Workspace / Operations / System`),
  active item gets a left ember accent stripe with a soft glow. Live
  System Strip at the bottom is wired to the realtime store — Postgres,
  Redis, workers each render as a live SignalDot row.
- **Topbar**: always-visible W3C `traceparent`-style breadcrumb, monospaced
  UTC clock, ⌘K search button with kbd chips, and the **"Ask Sequoia"**
  ember-amber CTA that opens the palette in AI mode.

### 4.2 Command palette (`cmdk`)

The keyboard-first soul of the OS.

- Three modes selectable as tabs: **Navigate · Ask Sequoia · Devices**.
- Triggers: `⌘K` (toggle), `Ctrl+Shift+A` (AI mode), `g h/d/a/w` (route).
- Natural-language mode: prefixing input with `>` (or pressing the AI tab)
  switches the icon to a flickering ember sparkle, swaps placeholder copy
  ("What should we do? e.g. ‘restart all offline edge devices’"), and routes
  the prompt to the AI orchestrator — the response can either render
  suggestions (cards with "Run workflow" buttons) or directly dispatch.
- A static index footer shows `indexed in 18.4ms` to communicate that this
  isn't a network round-trip but a local index — small detail, big trust.

---

## 5. Realtime data layer

### 5.1 Wire protocol

WebSocket against `realtime-gateway` (port 8083). Tickets are 60-second
single-use, fetched per connect attempt from `/api/auth/ws-ticket` — JWTs
never travel in the URL.

All payloads are JSON `Envelope` matching the server's
`libs/eventbus::Envelope` shape:

```ts
interface Envelope<T> {
  id: string;
  kind: EventKind;        // device_telemetry | ai_run_finished | ...
  tenant_id: string;
  correlation_id: string;
  occurred_at: string;
  payload: T;
}
```

### 5.2 Client architecture

```
┌────────────────────────┐
│      RealtimeClient    │   src/lib/ws/client.ts
│      (singleton)       │
└──────────┬─────────────┘
           │ envelopes
           ▼
┌────────────────────────┐
│   RealtimeBoundary     │   mounted in providers.tsx
│  (route subscription)  │
└─┬──────────────────────┘
  │                  │
  ▼                  ▼
Zustand store    TanStack QueryClient
(live UI state)  (.setQueryData on cached lists)
```

- **Connection lifecycle**: exponential backoff with full jitter (max 30s),
  reset on success. App-level liveness pong every 30s — silent socket gets
  closed and reconnected.
- **Outbox**: max 256 frames buffered while offline; oldest drops first
  (we accept telemetry tail-drop over OOM).
- **Bridging to TanStack Query**: each envelope kind has a matching cache
  update path (`device_telemetry` patches the cached device row;
  `workflow_*` invalidates `["workflows"]`). Pages thus don't need to
  dual-subscribe — they consume queries and live data flows in.

### 5.3 Optimistic UI

Mutations use `onMutate` to write the optimistic record into the cache and
return a rollback function; `onError` restores the prior value. Pattern is
documented in `lib/api/hooks.ts::useDispatchCommand`.

### 5.4 Offline support

- Service worker (Next.js built-in) precaches the app shell + critical static.
- Zustand's `subscribeWithSelector` is persisted (selected slices only) to
  IndexedDB so a refresh while offline still paints stale-but-truthful data.
- "Stale" badges automatically appear in the topbar when WS status ≠ open.

---

## 6. State management

**Two layers, clear ownership:**

| Layer | What lives here | Tool |
|-------|-----------------|------|
| Server cache | API responses, paginated lists, mutations | TanStack Query |
| Live UI | WS connection status, device live map, recent events buffer, command-palette mode | Zustand |
| URL | Filters, tabs, sort, selection (where useful) | Next.js search params + nuqs (optional) |
| Form | Field state + validation | react-hook-form + zod |

We **never** put server data in Zustand or live state in React Query —
keeps both reasoning models clean.

---

## 7. Page-by-page concept

### 7.1 Dashboard — `/dashboard`

The hero. Distinctive moves:

- **Editorial hero plate** with the AmbientPulse SVG wave behind a 68 px
  italic serif headline ("Every signal in one instrument."). Hero KPI strip
  below — 4 stats with italic serif numerics.
- **FleetMap** — a hand-drawn equirectangular plot. Devices appear as dots
  with concentric expanding rings (warning) or steady mints (healthy).
  Animated trace arcs between two points convey active workflows. **No
  Leaflet, no Mapbox** — pure SVG, looks intentional, scales.
- **AI Copilot panel** (right column) — streaming "typewriter" text via a
  rAF loop, suggestion cards animate in stagger. Compose box at bottom.
- Activity feed with a vertical lane line + node icons (timeline style,
  not yet another tabular list).

### 7.2 Devices — `/devices` + `/devices/[id]`

- **List view**: dense table with per-row CPU/RAM bar cells and a 100-pt
  sparkline. View toggle (list/grid). Filter chips animate.
- **Detail page**: metric strip (4 cards), terminal-style live console
  with timestamped color-coded levels (INFO/WARN/ERROR) + a blinking caret,
  process viewer table, filesystem usage bars, plugin list, identity panel
  with attestation status.

### 7.3 AI Control Center — `/ai`

- **Agents grid**: each card shows status, model, recent token cost, runs,
  a 40-point sparkline. Status colors `running` (ember), `idle` (bone),
  `blocked` (flame), `cooldown` (steel).
- **Multi-agent live coordination** plate: a horizontal timeline with one
  swim-lane per agent and animated event tiles sliding in. This is the
  visual hero — turns the abstract A2A bus into something operators can read.

### 7.4 Workflow Builder — `/workflows/builder/[id]`

- A blueprint canvas: deep onyx with a 32 px radial-dot grid. Edges are
  cubic bezier curves overlaid with an animated dashed ember stroke
  (suggests **flow direction**).
- Node cards have a colored kind-icon corner, an eyebrow label, and a
  monospaced subtitle. Active node gets an ember glow ring.
- Three-pane layout: node palette · canvas · inspector. ReactFlow is
  available as a drop-in upgrade; the baseline canvas is fast and
  keyboard-navigable.

### 7.5 Notifications — `/notifications`

- Inbox cards with kind icons (crit/warn/info), action buttons (Snooze /
  Acknowledge), channel status panel showing all delivery channels with
  live signal dots + latency.

### 7.6 Identity — `/users`

- Users table with avatar gradient initials, role badge, MFA method icon
  (`fingerprint` for webauthn, `key-round` for totp, flame "none" for the
  laggards), sessions column.
- Live sessions panel — shows currently-active devices with live pulse.

### 7.7 Settings — `/settings`

- A 3×2 grid of section cards, each with a hover treatment (icon swaps to
  ember). Below: a live "Service tokens" plate with revoke actions.

### 7.8 Login — `/login`

- Split screen. **Left**: a giant editorial italic headline
  ("One instrument for the entire fleet.") under a brand wordmark, with
  the ember radial atmosphere. **Right**: the form on a glass plate.

---

## 8. Animation architecture

Three principles:

1. **High-impact moments over many micro-interactions.** Each page has one
   orchestrated reveal (`fade-up` staggered via `--d`) instead of dozens of
   tiny hover wiggles.
2. **CSS first, JS when interactive.** Sparklines, dots, ambient pulses,
   marquee strips are all CSS-only. `motion` is used only where physics
   matter (sidebar drawers, suggestion-card slides).
3. **GPU-friendly only.** Translate / opacity / scale. No `width`/`height`
   transitions, no box-shadow animations on hot paths.

---

## 9. Theme engine

- Default theme: dark (the platform was designed for it).
- Light theme (`html.theme-light`) exists primarily for printed/exported
  reports and external embeds — flipping it only requires swapping the
  CSS variables under `.theme-light`.
- Per-tenant accent override: tenant settings can override `--ember` (and
  the platform falls back to amber default).
- All theme switching is variable-only — zero CSS recompile.

---

## 10. Tauri desktop integration

A 12 MB native shell on Mac/Win/Linux that hosts the same Next.js bundle.

- **Window**: titlebar hidden (`titleBarStyle: "Overlay"`), traffic-lights
  positioned to match the topbar's hairline (18,18).
- **Tray**: persistent menu — Open · Quick action (⌘⇧K) · Quit. Left-click
  shows the window; menu emits a Tauri event that triggers the palette.
- **Native notifications**: alerts continue to fire when the window is
  hidden. `lib/tauri/bridge.ts::notify()` is a single API; in browsers it
  falls back to the Web Notifications API.
- **OS keyring**: `keyring_get` / `keyring_set` Tauri commands wrap the
  Rust `keyring` crate. The refresh token is stored in OS keyring (not
  localStorage) on desktop — survives reboot, doesn't leak to malicious
  extensions.
- **Deep links**: `sequoia://device/dvc_…` opens the device page.

The Next.js config switches to `output: "export"` when `SEQUOIA_DESKTOP=1`,
producing a pure static bundle Tauri loads via the file protocol with a
strict CSP.

---

## 11. Mobile + responsive

- **Breakpoints**: `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1600`.
- **Behaviors**:
  - Sidebar collapses to a drawer below 1024 px (via `vaul`).
  - Topbar's search becomes an icon button below 768 px.
  - Tables collapse to a label-value list (`<dl>`) below 640 px — we keep
    the data, drop the columns.
  - Touch targets enforce ≥ 36 px on `pointer:coarse`.
- A future Capacitor wrapper publishes to iOS/Android without forking — the
  same WebSocket realtime client and PWA shell work on mobile WebView.

---

## 12. Performance

- **Routes are RSC by default**, client components only where they need
  state, refs, or browser APIs.
- **`next/font`** with `display: "swap"` + variable fonts → no FOIT.
- **Bundle hygiene**: `experimental.optimizePackageImports` targets
  `lucide-react`, `motion`, and Radix to avoid pulling unused icon trees.
- **Image strategy**: we ship near-zero raster — primary visuals are SVG
  + CSS. `noise.svg` is the only consistently-painted graphic.
- **Streaming**: dashboard cards are rendered in two `<Suspense>` waves so
  the hero plate paints in <100 ms even when the AI panel is fetching.
- **Lazy boundaries**: workflow builder + reactflow integration are code-split.

Performance budget:

| Surface              | Target          |
|----------------------|-----------------|
| LCP (`/dashboard`)   | < 1.2 s         |
| TBT                  | < 100 ms        |
| JS shipped (gzip)    | < 220 KB shell  |
| FPS on hover/scroll  | 60 (sustained)  |

---

## 13. Security UX

- **Auth**: SSO (OIDC) preferred, password+WebAuthn fallback. Login page
  shows a passkey option first whenever a webauthn credential exists.
- **MFA management**: visible per user in `/users`, with an explicit `none`
  flame chip on accounts that haven't enrolled.
- **Session visibility**: each user sees a live "Sessions" plate listing
  every authenticated client, including the current one (highlighted).
- **Permission indicators**: read-only routes display a small "Read-only"
  Badge in the topbar when the operator lacks write scope. Mutating actions
  are disabled (not hidden) so users understand what's possible.
- **Sensitive actions**: irreversible operations open a confirmation drawer
  with a typed-confirmation pattern (type the resource name to enable).
- **Audit visibility**: every mutation surfaces a toast linking to its
  audit-log entry. The link copies the trace id to clipboard.
- **CSP** (Tauri build): default-src self; connect-src restricted to API
  and WS hosts; no inline scripts.

---

## 14. AI-native UX

This is not "ChatGPT in a sidebar." Sequoia treats the AI as a first-class
operator:

1. **The palette is also the prompt.** Every cmdk session can flip to
   AI mode — natural-language commands ("restart all offline edge devices
   in europe-west") become workflows. Suggested actions appear as cards
   you can `↵` to dispatch.
2. **Contextual suggestions.** Each route registers an "AI context" (the
   current view, the visible filter, the recent events). The Copilot panel
   uses that context to draft specific recommendations — not generic ones.
3. **Inline tool affordances.** The AI panel's suggestion cards have
   typed buttons (Run workflow / Schedule / Capture trace) that map 1:1 to
   `ai-orchestrator::tools`. Every suggestion is actionable, not a wall of
   text.
4. **Streaming progress.** The dashboard hero shows the copilot writing in
   real time via a rAF loop — distinctive, calm. Multi-agent coordination
   gets a horizontal timeline visualization (`/ai`), turning A2A traffic
   into something operators can read.
5. **Budget visibility.** Token / cost meters live on every agent card
   and run row. Operators see what the AI is spending.

---

## 15. Component hierarchy (excerpt)

```
RootLayout
└── Providers
    ├── QueryClientProvider
    ├── ThemeProvider
    ├── RealtimeBoundary (singleton WS subscription)
    └── CommandPaletteProvider
        ├── Dialog (cmdk)
        └── (app children)
            └── (app)/layout.tsx
                ├── Sidebar
                ├── Topbar
                └── <page/>
                    ├── Plate (hero / section)
                    │   ├── PlateHeader > PlateTitle
                    │   ├── PlateBody
                    │   └── PlateFooter
                    ├── Stat / Sparkline / Badge / SignalDot
                    └── widgets/{ActivityFeed, AIAssistantPanel, FleetMap}
```

---

## 16. Production readiness

| Surface                              | Status                          |
|--------------------------------------|---------------------------------|
| Token system                          | ✅ complete                     |
| Primitives library                    | ✅ Button/Plate/Badge/Stat/Sparkline/SignalDot/Kbd |
| App shell                             | ✅ Sidebar/Topbar/Palette/Toaster |
| Dashboard                             | ✅ end-to-end visual            |
| Devices list & detail                 | ✅ end-to-end                   |
| AI control center                     | ✅ end-to-end                   |
| Workflow list                         | ✅                              |
| Workflow builder canvas               | ✅ baseline (reactflow drop-in) |
| Notifications inbox                   | ✅                              |
| Users + RBAC                          | ✅                              |
| Settings landing                      | ✅                              |
| Login (editorial)                     | ✅                              |
| Realtime client + boundary            | ✅                              |
| Zustand store                         | ✅                              |
| API client + first hooks              | ✅                              |
| Tauri shell + bridge                  | ✅                              |
| PWA manifest + service worker         | ✅ manifest; SW via Next defaults |
| Storybook                             | ⏳ (next iteration — primitives have stable APIs) |
| E2E (Playwright)                      | ⏳                              |
| Visual regression (Chromatic)         | ⏳                              |
| i18n (`next-intl`)                    | ⏳                              |

---

## 17. Where to extend

- **New page**: drop a `page.tsx` in `src/app/(app)/<name>/` — it inherits
  the shell and palette automatically.
- **New domain query**: add a typed hook in `src/lib/api/hooks.ts`. If the
  resource emits live updates, wire its `EventKind` in
  `RealtimeBoundary` to invalidate the right query keys.
- **New chart**: extend `components/primitives/` with the same hairline
  + tabular-num + 1.25 stroke vocabulary so it reads like a Sequoia chart.
- **Per-tenant theme**: override CSS variables in a `<style>` block injected
  by the layout based on tenant config — no rebuild.

---

## 18. Operating principles (the "north stars")

1. **Density without noise** — every pixel earns its place, but the surface
   stays calm.
2. **Keyboard before mouse** — every action has a shortcut, and the palette
   knows every action.
3. **Realtime is invisible until it matters** — streaming is default, but
   the UI never animates for its own sake.
4. **Editorial moments earn the screen** — the italic serif appears at
   page seams, not on every label.
5. **The AI is a first-class operator**, not a chatbot.
