# NorthStar — Frontend Design Document

> **Soul reference:** incident.io — same structural clarity, same density, same zero-decoration philosophy.
> **Primary color:** Cyan `#22D3EE` — not blue, not orange. Signal wire on dark glass.

---

## 1. Design Philosophy

NorthStar is an **Operate** surface. Engineers use it under pressure, at 2am, during a P1. Every design decision flows from one question: *does this help someone act faster?*

**Priority order — locked, never reordered:**
1. **Scanability** — the right information must be findable in under 2 seconds
2. **Consistency** — same pattern, same placement, every time. No surprises
3. **Native expectations** — behave like the OS and browser the user already knows
4. **Expression** — brand lives in precise details, never in decoration that competes with data

**What this means in practice:**
- No hero images, gradients on text, or animated backgrounds
- No tooltips that hide critical information
- No modals for destructive actions (use inline confirmation)
- No color used purely for aesthetics — every color communicates state
- Dense by default — data tables show 20 rows, not 8
- Motion serves information, never decoration

---

## 2. Color System

### 2.1 Design Tokens

```css
/* globals.css */
@layer base {
  :root {
    /* ── Surfaces ─────────────────────────────────────── */
    --background:        10  13  26;     /* #0A0D1A  deep navy — page bg       */
    --surface-1:         15  20  40;     /* #0F1428  card, sidebar, panels      */
    --surface-2:         20  28  55;     /* #141C37  elevated panels, dropdowns */
    --surface-3:         26  36  70;     /* #1A2446  hover state, selected rows */
    --border:            38  50  90;     /* #263256  all borders                */

    /* ── Brand ───────────────────────────────────────── */
    --accent:            34 211 238;     /* #22D3EE  cyan-400  primary accent   */
    --accent-dim:         6 182 212;     /* #06B6D4  cyan-500  pressed/active   */
    --accent-glow:       103 232 249;    /* #67E8F9  cyan-300  focus ring, glow */

    /* ── Semantic ────────────────────────────────────── */
    --success:           34 197  94;     /* #22C55E  green  — healthy           */
    --warning:          251 191  36;     /* #FBBF24  amber  — degraded, at-risk */
    --critical:         239  68  68;     /* #EF4444  red    — P1, error, breach */
    --critical-pulse:   220  38  38;     /* #DC2626  P1 banner pulse            */

    /* ── Text ────────────────────────────────────────── */
    --foreground:       241 245 249;     /* #F1F5F9  primary text               */
    --muted:            100 116 139;     /* #64748B  secondary text, labels     */
    --subtle:            51  65  85;     /* #334155  placeholder, disabled      */

    /* ── Chart Palette (fixed order — never swap) ─────── */
    --chart-1:           34 211 238;     /* cyan    — primary series            */
    --chart-2:           34 197  94;     /* green   — secondary series          */
    --chart-3:          251 191  36;     /* amber   — tertiary series           */
    --chart-4:          168  85 247;     /* purple  — quaternary series         */
    --chart-5:          239  68  68;     /* red     — error/critical series     */
  }
}
```

### 2.2 Tailwind Mapping

```ts
// tailwind.config.ts
colors: {
  background: 'rgb(var(--background) / <alpha-value>)',
  surface: {
    1: 'rgb(var(--surface-1) / <alpha-value>)',
    2: 'rgb(var(--surface-2) / <alpha-value>)',
    3: 'rgb(var(--surface-3) / <alpha-value>)',
  },
  accent: {
    DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
    dim:     'rgb(var(--accent-dim) / <alpha-value>)',
    glow:    'rgb(var(--accent-glow) / <alpha-value>)',
  },
  success:  'rgb(var(--success) / <alpha-value>)',
  warning:  'rgb(var(--warning) / <alpha-value>)',
  critical: {
    DEFAULT: 'rgb(var(--critical) / <alpha-value>)',
    pulse:   'rgb(var(--critical-pulse) / <alpha-value>)',
  },
  border:   'rgb(var(--border) / <alpha-value>)',
  fg: {
    DEFAULT: 'rgb(var(--foreground) / <alpha-value>)',
    muted:   'rgb(var(--muted) / <alpha-value>)',
    subtle:  'rgb(var(--subtle) / <alpha-value>)',
  },
  chart: {
    1: 'rgb(var(--chart-1) / <alpha-value>)',
    2: 'rgb(var(--chart-2) / <alpha-value>)',
    3: 'rgb(var(--chart-3) / <alpha-value>)',
    4: 'rgb(var(--chart-4) / <alpha-value>)',
    5: 'rgb(var(--chart-5) / <alpha-value>)',
  },
}
```

### 2.3 Color Usage Rules

| Color | Use for | Never use for |
|---|---|---|
| `accent` (#22D3EE) | Interactive elements, links, active nav, focused inputs, primary CTAs | Status indicators, charts (except first series) |
| `success` (#22C55E) | Healthy status, resolved incidents, uptime badges | Active/selected states |
| `warning` (#FBBF24) | Degraded status, SLA at risk (≤30min), P2/P3 severity pills | Brand elements |
| `critical` (#EF4444) | P1, errors, SLA breached, CrashLoopBackOff, fired alerts | Decorative elements |
| `border` (#263256) | All dividers and card outlines | Text |
| `fg.muted` (#64748B) | Timestamps, secondary labels, empty states | Primary content |

---

## 3. Typography

NorthStar lives in the 11–16px range. This is not a marketing site — it is a dense data interface. The largest text on screen is a page title at 16px. Everything below it is a deliberate step down in visual weight, not size.

### 3.1 Fonts

**IBM Plex Sans** — UI text. Slightly condensed, engineered for legibility at small sizes, carries IBM's technical authority. Distinct from Inter without being eccentric.

**IBM Plex Mono** — all numeric data, IDs, log lines, query inputs. Narrower than JetBrains Mono, which means more data fits per line. The monospace choice is a data-density decision, not an aesthetic one.

```ts
// app/layout.tsx
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-sans',
})

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
})
```

```ts
// tailwind.config.ts
fontFamily: {
  sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
  mono: ['var(--font-mono)', 'monospace'],
}
```

### 3.2 The Scale

This interface has exactly four text sizes. Not six. Not eight.

| px | Usage |
|---|---|
| **16px** | Page title only — one per page, never repeated |
| **13px** | Body copy, descriptions, incident titles, nav labels, button text |
| **12px** | Table cell content, badge text, metadata, sidebar secondary text |
| **11px** | Column headers (uppercase), section labels (uppercase), status chips |

```ts
// tailwind.config.ts
fontSize: {
  // Page title — one per screen
  title:  ['16px', { lineHeight: '1.4', fontWeight: '600', letterSpacing: '-0.01em' }],

  // All prose, interactive text, incident titles
  base:   ['13px', { lineHeight: '1.5', fontWeight: '400' }],

  // Table cells, badge labels, timestamps, sidebar links
  sm:     ['12px', { lineHeight: '1.4', fontWeight: '400' }],

  // Uppercase labels only — column headers, section dividers, status chips
  label:  ['11px', { lineHeight: '1', fontWeight: '600', letterSpacing: '0.06em' }],
}
```

### 3.3 Weights — Used Deliberately

IBM Plex Sans has many weights. NorthStar uses four, each with a specific job:

| Weight | Class | When to use |
|---|---|---|
| 300 Light | `font-light` | Large numeric KPI values on the dashboard (the lightness makes big numbers feel precise, not heavy) |
| 400 Regular | `font-normal` | All body text, table cells, descriptions |
| 500 Medium | `font-medium` | Nav labels, button text, incident titles, anything the eye needs to land on first |
| 600 SemiBold | `font-semibold` | Page titles, severity pills (P1/P2), section headers, column labels |

Never use 700 Bold anywhere in the UI except the P1 banner.

### 3.4 Uppercase Label Rule

Every column header, every section divider label, every status chip uses the `label` size with uppercase. This is the single most important typographic rule in the system — it creates clear visual separation between "this is structural chrome" and "this is data."

```tsx
// Always this — never use font-semibold + 12px for column headers
<th className="text-label uppercase text-fg-muted tracking-[0.06em]">
  PRIORITY
</th>

// Section dividers in sidebar
<p className="text-label uppercase text-fg-subtle tracking-[0.06em] px-3 mb-1">
  OBSERVABILITY
</p>
```

### 3.5 Tabular Numbers — Non-Negotiable

Every number that lives in a column, a badge, a timer, or a metric value must use tabular figures so digits stay the same width and columns don't jitter as values change.

```css
/* globals.css — applied globally to font-mono elements */
.font-mono {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}
```

Apply `font-mono` to:
- SLA countdowns (`00:43:12`)
- All metric values (latency, error rate, RPS)
- Trace/span IDs
- Log timestamps
- PromQL and LogQL input fields
- Any number that appears in a table column

Apply `font-sans` with `tabular-nums` via CSS where mono font would look wrong (KPI counters on dashboard):

```tsx
<span className="text-title font-light tabular-nums">
  {kpiValue}
</span>
```

### 3.6 Hierarchy Through Opacity, Not Size

Because the scale is tight, hierarchy is communicated through **color opacity**, not font size changes.

```tsx
// Three-level text hierarchy — all at 13px
<div className="text-base">
  <span className="text-fg">payment-service degraded</span>        {/* primary */}
  <span className="text-fg-muted">· production · assigned to J.D.</span>  {/* secondary */}
  <span className="text-fg-subtle">· 3 min ago</span>              {/* tertiary */}
</div>
```

This is how incident.io achieves information density without visual noise — same size, different opacity.

### 3.7 Line Height by Context

Line height is not one value. It changes based on what the text is doing:

| Context | Line height | Why |
|---|---|---|
| Table rows | `leading-none` (1) | Row height is controlled by padding, not line height |
| Single-line labels | `leading-none` (1) | Badges, pills, chips — height set by padding |
| Body text, descriptions | `leading-relaxed` (1.625) | Needs breathing room for reading |
| Log lines | `leading-snug` (1.375) | Dense but scannable |
| Page title | `leading-tight` (1.25) | Never wraps, so tight is fine |

### 3.8 Prose Rules

- Never center-align body text — left-align only
- Never justify text
- Max line width for readable prose (incident descriptions, KB articles, copilot responses): `max-w-prose` (65ch)
- Copilot streaming text: `whitespace-pre-wrap` to preserve LLM line breaks

---

## 4. Layout System

### 4.1 Shell Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  Topbar  h-12  bg-surface-1/80 backdrop-blur border-b border-border│
│  breadcrumb · Cmd+K search · notification bell · user avatar    │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                   │
│   Sidebar    │   Main Content Area                               │
│   w-[220px]  │   flex-1  overflow-y-auto                        │
│   collapsed  │   px-6 py-6                                       │
│   w-[48px]   │   max-w-screen-2xl mx-auto                       │
│              │                                                   │
│   bg-surface-1│                                                  │
│   border-r   │                                                   │
│   border-border│                                                 │
└──────────────┴──────────────────────────────────────────────────┘
```

### 4.2 Sidebar

```
┌────────────────────┐
│  ◈ NorthStar       │  ← logo + wordmark, h-12, border-b border-border
├────────────────────┤
│  ○  Ops Center     │  ← active: bg-accent/10 text-accent border-l-2 border-accent
│  ○  Services       │  ← default: text-fg-muted hover:bg-surface-3 hover:text-fg
│  ○  Metrics        │
│  ○  Traces         │
│  ○  Logs           │
│  ○  Kubernetes     │
├────────────────────┤  ← section divider: border-t border-border my-2
│  ○  Alerts         │
│  ○  Incidents      │
│  ○  Changes        │
│  ○  Problems       │
│  ○  CMDB           │
├────────────────────┤
│  ○  Synthetic      │
│  ○  Knowledge Base │
│  ○  AI Copilot     │
├────────────────────┤
│  ◈  Settings       │  ← pinned to bottom
└────────────────────┘
```

- Nav items: `flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-small font-medium transition-colors`
- Active: `bg-accent/10 text-accent border-l-2 border-accent -ml-[2px]`
- Icon size: `w-4 h-4` (lucide-react, `strokeWidth={1.5}`)
- Collapsed: icon only, tooltip on hover

### 4.3 Grid System

```ts
// Page-level grids
'grid-cols-12'           // 12-column base
'gap-4'                  // 16px gutters between cards
'gap-6'                  // 24px gutters between sections

// Common layouts
'lg:grid-cols-[300px_1fr]'  // sidebar panel + main (metrics explorer, log explorer)
'lg:grid-cols-[1fr_320px]'  // main + right panel (incident detail)
'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'  // entity cards
```

### 4.4 Spacing Scale

Use Tailwind defaults. Key values used across the system:

| Value | px | Usage |
|---|---|---|
| `p-3` | 12px | Compact cells, small badges |
| `p-4` | 16px | Standard card padding |
| `p-5` | 20px | Large cards, detail panels |
| `p-6` | 24px | Page-level padding |
| `gap-4` | 16px | Card gutters |
| `gap-6` | 24px | Section gutters |

---

## 5. Core Components

### 5.1 Cards

All cards share one base class — no exceptions:

```
rounded-xl border border-border bg-surface-1
```

Variants:

```tsx
// Default card
<div className="rounded-xl border border-border bg-surface-1 p-4" />

// Hoverable card (entity cards, incident rows as cards)
<div className="rounded-xl border border-border bg-surface-1 p-4
                hover:border-accent/40 transition-colors cursor-pointer" />

// Selected / active card
<div className="rounded-xl border border-accent/50 bg-accent/5 p-4" />

// Critical state card (P1 incident, breached SLA)
<div className="rounded-xl border border-critical/40 bg-critical/5 p-4" />
```

### 5.2 Health Badges

Four states only. Never invent new ones.

```tsx
const variants = {
  healthy:  'bg-success/15  text-success  border border-success/30',
  degraded: 'bg-warning/15  text-warning  border border-warning/30',
  critical: 'bg-critical/15 text-critical border border-critical/30',
  unknown:  'bg-fg-muted/15 text-fg-muted border border-fg-muted/30',
}

// Dot indicator
const dots = {
  healthy:  'bg-success',
  degraded: 'bg-warning',
  critical: 'bg-critical animate-pulse',
  unknown:  'bg-fg-muted',
}

// Usage
<span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-small font-medium ${variants[status]}`}>
  <span className={`w-1.5 h-1.5 rounded-full ${dots[status]}`} />
  {status}
</span>
```

### 5.3 Severity Pills (Incidents / Alerts)

```tsx
const severity = {
  P1: 'bg-critical/20 text-critical  font-semibold',
  P2: 'bg-warning/20  text-warning   font-semibold',
  P3: 'bg-accent/20   text-accent    font-medium',
  P4: 'bg-fg-muted/15 text-fg-muted  font-medium',
}

// Always fixed width so columns align
<span className={`inline-block w-8 text-center px-1.5 py-0.5 rounded text-small ${severity[p]}`}>
  {p}
</span>
```

### 5.4 SLA Countdown Badge

```tsx
// > 30 min remaining  → muted
// ≤ 30 min remaining  → warning
// ≤ 15 min remaining  → critical + pulse

const slaClass =
  minsLeft > 30 ? 'text-fg-muted' :
  minsLeft > 15 ? 'text-warning' :
                  'text-critical animate-pulse'

<span className={`font-mono text-small ${slaClass}`}>
  {formatCountdown(minsLeft)}
</span>
```

### 5.5 Data Tables

```
┌─────────┬──────────────────────────────┬──────────┬────────────┬──────────┐
│ PRIORITY │ TITLE                        │ ENTITY   │ SLA        │ STATUS   │
├─────────┼──────────────────────────────┼──────────┼────────────┼──────────┤
│  P1     │ Payment service degraded     │ payment  │ 00:43:12   │ Open     │
│  P2     │ Inventory latency spike      │ invntory │ 03:12:00   │ Assigned │
│  P3     │ Notification queue backed up │ notif    │ 14:22:00   │ Open     │
└─────────┴──────────────────────────────┴──────────┴────────────┴──────────┘
```

Rules:
- Header: `text-small font-medium text-fg-muted uppercase tracking-wide`
- Row: `border-b border-border hover:bg-surface-3 cursor-pointer transition-colors`
- Priority column: fixed `w-12`, centered
- SLA column: `font-mono text-small`
- All tables are horizontally scrollable on mobile: `overflow-x-auto`
- Row height: `h-11` (44px) — dense, never spacious

### 5.6 Empty States

Every list view must have a designed empty state.

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <Icon className="w-8 h-8 text-fg-subtle mb-3" />
  <p className="text-subheading text-fg mb-1">{title}</p>
  <p className="text-small text-fg-muted max-w-xs">{description}</p>
  {action && <Button variant="outline" className="mt-4">{action}</Button>}
</div>
```

### 5.7 Skeleton Loaders

Render at the same height as real content — never a spinner in the center of a panel.

```tsx
// Match the real component dimensions exactly
<Skeleton className="h-11 w-full rounded-lg" />   // table row
<Skeleton className="h-[200px] w-full rounded-xl" /> // chart
<Skeleton className="h-4 w-32 rounded" />           // inline text
```

### 5.8 Buttons

```tsx
// Primary CTA — cyan fill
<Button className="bg-accent text-background hover:bg-accent-dim font-medium">
  Create Incident
</Button>

// Secondary — outline
<Button variant="outline" className="border-border text-fg hover:bg-surface-3">
  View Logs
</Button>

// Destructive
<Button className="bg-critical/10 text-critical border border-critical/30 hover:bg-critical/20">
  Escalate to P1
</Button>

// Ghost — for icon buttons in tables/toolbars
<Button variant="ghost" size="icon" className="text-fg-muted hover:text-fg hover:bg-surface-3">
  <CopyIcon className="w-4 h-4" />
</Button>
```

### 5.9 Inputs + PromQL / LogQL Fields

```tsx
// Standard input
<input className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2
                  text-body text-fg placeholder:text-fg-subtle
                  focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                  transition-colors font-sans" />

// Code input (PromQL, LogQL)
<textarea className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2
                     text-mono text-fg placeholder:text-fg-subtle
                     focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                     font-mono resize-none" />
```

### 5.10 Tabs

```tsx
// Page-level tabs (Incident detail, Entity detail)
<div className="flex border-b border-border gap-0">
  {tabs.map(tab => (
    <button className={`px-4 py-2.5 text-small font-medium border-b-2 transition-colors
      ${active === tab.id
        ? 'border-accent text-accent'
        : 'border-transparent text-fg-muted hover:text-fg hover:border-border'
      }`}>
      {tab.label}
    </button>
  ))}
</div>
```

---

## 6. Motion + Animation

### 6.1 Rules

- Every animation must communicate state change or guide attention
- No animation purely for aesthetics
- Respect `prefers-reduced-motion` — wrap all Framer Motion with `useReducedMotion`

### 6.2 Timing Reference

| Animation | Duration | Easing | Usage |
|---|---|---|---|
| Page enter | 200ms | `easeOut` | Every route change |
| Card mount | 150ms + 40ms stagger | `easeOut` | List items |
| KPI counter | 800ms | `easeInOut` | Number changes on dashboard |
| Alert pulse | 1000ms loop | `easeInOut` | P1 banner, critical SLA badge |
| Topology node | 300ms spring | `stiffness:200 damping:20` | Health state change |
| Drawer open | 250ms | `easeOut` | Copilot drawer, side panels |
| Sidebar collapse | 200ms | `easeInOut` | Width transition |

### 6.3 Standard Variants

```tsx
// Page enter
const page = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
}

// Staggered list
const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const item      = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }

// Slide-in drawer (right side)
const drawer = {
  hidden: { x: '100%', opacity: 0 },
  show:   { x: 0, opacity: 1, transition: { duration: 0.25, ease: 'easeOut' } },
}

// Scale pop (badges, toasts)
const pop = {
  hidden: { scale: 0.9, opacity: 0 },
  show:   { scale: 1, opacity: 1, transition: { duration: 0.15, ease: 'easeOut' } },
}
```

---

## 7. Charts

### 7.1 Recharts Rules

- Background: always transparent (inherits `surface-1`)
- Grid lines: `stroke="rgb(var(--border))" strokeDasharray="3 3" strokeOpacity={0.5}`
- Axes: `tick={{ fill: 'rgb(var(--muted))', fontSize: 11 }}` `axisLine={false}` `tickLine={false}`
- Tooltip: custom `<ChartTooltip>` — `bg-surface-2 border-border rounded-lg shadow-xl`
- No chart legends inside the chart area — use external labels above the chart
- All charts wrapped in `<ResponsiveContainer width="100%" height={N}>`
- Time axes in sparklines: relative ("2m ago", "1h ago") — never raw timestamps

### 7.2 Area Chart (Metrics Explorer, Golden Signals)

```tsx
<AreaChart data={data}>
  <defs>
    <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stopColor="rgb(var(--accent))" stopOpacity={0.25} />
      <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity={0}    />
    </linearGradient>
  </defs>
  <Area
    type="monotone"
    dataKey="value"
    stroke="rgb(var(--accent))"
    strokeWidth={1.5}
    fill="url(#cyanGradient)"
    dot={false}
  />
</AreaChart>
```

### 7.3 Sparklines

- Height: `h-12` (48px) inline, `h-16` (64px) in cards
- No axes, no tooltip, no grid — signal shape only
- Stroke: `rgb(var(--accent))` strokeWidth `1.5`

### 7.4 Topology Graph (D3)

- Canvas: `w-full h-[calc(100vh-8rem)] bg-surface-1 rounded-xl border border-border`
- Node radius: `r=28`
- Node fill: `surface-2`; stroke by health (`success/warning/critical` at full opacity, `border` for unknown)
- Critical node: stroke `critical` + `animate-pulse` glow ring (SVG `filter: drop-shadow`)
- Edge: `stroke-width=1.5`; healthy=`border`; degraded=`warning`; error_rate>5%=`critical` + animated dash
- Node label: `text-small font-mono text-fg-muted` centered below node
- Force simulation: `d3.forceLink` + `d3.forceManyBody(strength=-300)` + `d3.forceCenter`

### 7.5 Trace Waterfall (Recharts Horizontal BarChart)

- Row height: `h-8` (32px) per span
- Bar color: deterministic by service name — `hash(serviceName) % 5` → `chart-N` token
- Error span: `bg-critical/30` + `stroke: critical` border
- Root span: always full width reference bar (100% of trace duration)
- Time axis: milliseconds, bottom, `font-mono text-small`

---

## 8. Screen-by-Screen Design

### 8.1 Ops Center Dashboard (`/`)

```
┌──────────────────────────────────────────────────────────────────┐
│  [AI Top Concern chip — amber, full width]                        │
│  "⚡ payment-service SLA at risk — 2 P1s active"                 │
├───────────┬───────────┬───────────┬───────────┬──────────────────┤
│  KPI Card │  KPI Card │  KPI Card │  KPI Card │  Alert Feed      │
│  P1 Count │  SLA %    │  MTTR     │  Services │  Ticker          │
│    [2]    │  [94.2%]  │  [42min]  │  [5/5 ✓]  │  ↕ scroll        │
├───────────┴───────────┴───────────┴───────────┤                  │
│                                               │                  │
│  Service Health (top 5 services)              │  [last 5 alerts] │
│  ┌──────────────────────────────────────────┐│                  │
│  │ api-gateway   [sparkline]  ●healthy p99:12ms ││               │
│  │ order-svc     [sparkline]  ●healthy p99:31ms ││               │
│  │ payment-svc   [sparkline]  ●critical p99:4.1s││               │
│  │ inventory-svc [sparkline]  ●degraded p99:802ms││              │
│  │ notif-svc     [sparkline]  ●healthy p99:22ms ││               │
│  └──────────────────────────────────────────┘│                  │
├───────────────────────────────────────────────┴──────────────────┤
│  Active Incidents                          │  Digest Panel        │
│  ┌──────────────────────────────────────┐  │  ┌───────────────┐  │
│  │ P1  Payment degraded  00:43 remaining│  │  │ AI Summary    │  │
│  │ P1  Cascade failure   01:12 remaining│  │  │ • 2 P1s active│  │
│  │ P2  Inventory spike   03:21 remaining│  │  │ • SLA at 94%  │  │
│  └──────────────────────────────────────┘  │  │ • Deploy risk │  │
│                                            │  └───────────────┘  │
└────────────────────────────────────────────┴─────────────────────┘
```

- KPI cards: `col-span-3 each` in 12-col grid; counter animates with `useMotionValue` + `useSpring` on value change
- Service health: `col-span-8`; each row is 44px with inline sparkline (`w-24 h-8`)
- Alert ticker: `col-span-4`; auto-scrolls; newest at top
- Digest panel: `col-span-4`; collapsible; "AI Top Concern" chip always visible in topbar

---

### 8.2 Service Topology Map (`/services`)

```
┌─────────────────────────────────────────┬──────────────────────┐
│  [Blast Radius toggle]  [Health filter] │  Service Detail Panel │
│                                         │  ─────────────────── │
│                                         │  payment-service      │
│         ┌──────────┐                    │  ● critical           │
│         │api-gateway│                   │                       │
│         └────┬──────┘                   │  p99 [chart 40px]     │
│              │                          │  error rate [chart]   │
│         ┌────▼──────┐                   │  RPS [chart]          │
│         │order-svc  │                   │                       │
│       ┌─┴──┬────────┴─┐                 │  Active Incidents (2) │
│  [pay-svc][inv-svc][notif-svc]          │  ─────────────────── │
│                                         │  P1 Payment degraded  │
│  Edges labeled: RPS · latency           │  P1 Cascade failure   │
│  Red edges = error_rate > 5%            │                       │
│  Animated dash on critical edges        │  [View Traces →]      │
└─────────────────────────────────────────┴──────────────────────┘
```

- Canvas: `col-span-8 h-[calc(100vh-8rem)]`
- Side panel: `col-span-4 h-full` slides in on node click with Framer Motion
- Blast radius mode: unaffected nodes fade to `opacity-30`; downstream nodes get amber ring

---

### 8.3 Metrics Explorer (`/metrics`)

```
┌──────────────────────────────────────────────────────────────────┐
│  PromQL  [________________________________________________]  [Run]│
│  Labels  [service_name ▾]  [status_code ▾]  [method ▾]           │
│  Range   [15m] [1h] [3h] [24h] [7d]  [Custom]                   │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Area chart — full width, h-64]                                 │
│   cyan line + gradient fill                                      │
│   Y-axis: auto-scaled with unit label (ms / req/s / %)          │
│   X-axis: relative time labels                                   │
│   Hover tooltip: exact value + timestamp                         │
│                                                                  │
├────────────────────────────────────────────────────────────────┤
│  Query result table (for instant queries)                        │
│  metric name · labels · value                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

### 8.4 Distributed Trace Viewer (`/traces`)

```
┌──────────────────────────────────────────────────────────────────┐
│  [service ▾]  [status ▾]  [duration > __ms]  [Search]           │
├──────────────────────────────────────────────────────────────────┤
│  api-gateway  POST /checkout  124ms  ● ok   2 min ago  abc123…  │
│  api-gateway  POST /checkout  4.1s   ● err  3 min ago  def456…  │  ← highlighted bg-critical/5
│  api-gateway  GET /products   31ms   ● ok   5 min ago  ghi789…  │
├──────────────────────────────────────────────────────────────────┤
│  TRACE DETAIL: def456… (4.1s total)                              │
│                                                                  │
│  api-gateway     ████████████████████████████████████  4.1s      │
│  order-svc         ██████████████████████████████      3.9s      │
│  payment-svc         ████████████████████████████   ● 3.8s ERR  │
│  inventory-svc       ████                             210ms      │
│                                                                  │
│  [Span detail drawer — slides from right on span click]          │
│  operation: db.query                                             │
│  db.statement: SELECT * FROM connection_pool...                  │
│  error: connection pool exhausted after 3000ms                   │
│  [View Logs for this trace →]                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

### 8.5 Log Explorer (`/logs`)

```
┌──────────────────────────────────────────────────────────────────┐
│  LogQL  [{service="payment-service"} |= "error" _____________]   │
│  Labels [service ▾]  [level ▾]  [Live Tail ◉]                   │
├──────────────────────────────────────────────────────────────────┤
│  ● ERROR  14:23:01.412  payment-service  DB connection pool…     │
│    ▼ expanded                                                    │
│    ┌────────────────────────────────────┐                        │
│    │ { "trace_id": "4bf92f35…",         │                        │
│    │   "error.type": "pool_exhausted",  │                        │
│    │   "payment.amount": 142.50 }       │                        │
│    └────────────────────────────────────┘                        │
│    [View Trace →]  trace_id: 4bf92f35…                          │
│                                                                  │
│  ● ERROR  14:23:00.891  payment-service  DB connection pool…     │
│  ● WARN   14:22:59.100  order-service    Payment timeout after…  │
│  ● INFO   14:22:58.301  api-gateway      POST /checkout 200 124ms│
└──────────────────────────────────────────────────────────────────┘
```

- Log rows: `font-mono text-[13px]`; `bg-critical/5` on ERROR rows, `bg-warning/5` on WARN
- Severity icon: colored dot `w-2 h-2 rounded-full` before timestamp
- `trace_id` always rendered as a link chip: `text-accent underline-offset-2 hover:underline`

---

### 8.6 Kubernetes Overview (`/kubernetes`)

```
┌──────────────────────────────────────────────────────────────────┐
│  [production] [staging] [dev]  ← namespace tabs                  │
├────────────────┬─────────────────┬───────────────────────────────┤
│  Node: node-1  │  Node: node-2   │  Node: node-3                 │
│  CPU  ████░ 71%│  CPU  ██░░ 42%  │  CPU  ████████ 91% ← amber   │
│  MEM  ███░ 68% │  MEM  ███░ 61%  │  MEM  ████████ 94% ← red     │
│  Pods: 12/15   │  Pods: 8/15     │  Pods: 14/15                  │
├────────────────┴─────────────────┴───────────────────────────────┤
│  PODS                                                            │
│  NAME                  NAMESPACE   STATUS          RESTARTS  AGE │
│  payment-svc-7d9f      production  CrashLoopBackOff  [47]   2h   │  ← bg-critical/5
│  payment-svc-8e2a      production  Running           [0]    2h   │
│  inventory-svc-3bc1    production  Running           [2]    1d   │
│  notif-svc-1aa0        production  OOMKilled         [12]   3h   │  ← bg-critical/5
│                                             [Create Incident →]  │
└──────────────────────────────────────────────────────────────────┘
```

---

### 8.7 Alert Center (`/alerts`)

```
┌──────────────────────────────────────────────────────────────────┐
│  [All] [Firing] [Resolved]    [+ New Rule]                       │
├──────────────────────────────────────────────────────────────────┤
│  SEVERITY  TITLE                        ENTITY     SINCE   INC   │
│  ■ CRIT   Payment error rate > 70%     payment    12m     P1→   │
│  ■ CRIT   Cascade failure detected     multiple   8m      P1→   │
│  ■ WARN   Inventory p99 > 800ms        inventory  3m      —     │
├──────────────────────────────────────────────────────────────────┤
│  ALERT RULES                                                     │
│  [+ Add Rule]                                                    │
│  ┌──────────────────────────────────────────────────────┐        │
│  │ Name         Condition              Severity  Auto-Inc│        │
│  │ Error rate   error_rate > 5%  5min  CRITICAL  ✓ P1   │        │
│  │ High latency p99 > 1s         5min  WARNING   ✗      │        │
│  └──────────────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────────────┘
```

---

### 8.8 Incident List (`/incidents`)

```
┌──────────────────────────────────────────────────────────────────┐
│  [All] [Open] [Assigned] [Resolved]   [+ Create]   [Search…]    │
├──────────────────────────────────────────────────────────────────┤
│   P   TITLE                         ENTITY     SLA         STATUS│
│  [P1] Payment service degraded      payment    00:43:12 ●  Open  │
│  [P1] Cascade failure               multiple   01:02:55 ●  Open  │
│  [P2] Inventory latency spike       inventory  03:21:00    Asgnd │
│  [P3] Notification queue delay      notif      14:22:00    Open  │
└──────────────────────────────────────────────────────────────────┘
```

---

### 8.9 Incident Detail (`/incidents/[id]`)

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Back    [P1] Payment service degraded           [Escalate ▾] │
│  payment-service · Open · John D. · SLA: 00:43:12 ●             │
├──────────────────────────────────────────────────────────────────┤
│  [Overview] [Traces] [Logs] [Related Entities] [AI RCA]          │
├──────────────────────────────────────────────────────────────────┤
│  AI RCA TAB:                                                     │
│                                                                  │
│  Confidence: ████████████████████░░░  91%                        │
│                                                                  │
│  Causal Chain:                                                   │
│  payment-db ──→ payment-svc ──→ order-svc ──→ api-gateway        │
│  [root: pulsing red]                                             │
│                                                                  │
│  Evidence:                                                       │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ [metric chart]  │  │ [trace link] │  │ [log excerpt]      │  │
│  │ pool saturation │  │ 4.1s span    │  │ pool exhausted err │  │
│  │ → 100% at 14:22 │  │ ● error      │  │ 14:23:01.412       │  │
│  └─────────────────┘  └──────────────┘  └────────────────────┘  │
│                                                                  │
│  Modality weights:  Metrics ████ 60%  Traces ██ 25%  Logs █ 15% │
├──────────────────────────────────────────────────────────────────┤
│  ACTIVITY TIMELINE                                               │
│  ○ 14:35  AI RCA generated — 91% confidence: payment-db pool     │
│  ○ 14:32  Auto-escalated to P1 by Alert Engine                   │
│  ○ 14:30  Incident created from alert: error_rate > 70%          │
└──────────────────────────────────────────────────────────────────┘
```

---

### 8.10 AI Copilot Drawer

```
        ┌──────────────────────────────────────┐
        │  NorthStar Copilot          ✕  Cmd+⇧A│
        │  ─────────────────────────────────── │
        │  Context:  2 P1s · 14 alerts · 3 RFCs│
        │            ↑ chips in accent/10 bg   │
        │  ─────────────────────────────────── │
        │                                      │
        │  > What's most urgent?               │
        │                                      │
        │  Two active P1 incidents:            │
        │  **Payment service** — connection    │
        │  pool exhausted, 47 orders failed.   │
        │  Root cause identified with 91%      │
        │  confidence. SLA breach in 43 min.  │
        │                                      │
        │  Recommend: page the DB team and     │
        │  increase pool size on payment-db.   │
        │  ─────────────────────────────────── │
        │  [____________________________] [▶]  │
        │  [Briefing]  [Safe to deploy?]       │
        └──────────────────────────────────────┘
```

- Width: `w-[420px]` fixed right, full height
- Input area: `bg-surface-2 border-t border-border p-4`
- Streaming text: `whitespace-pre-wrap font-sans text-body`; tokens stream in left-to-right
- Quick prompt chips: `bg-surface-3 border border-border rounded-full px-3 py-1 text-small hover:border-accent/50`

---

### 8.11 P1 Alert Banner

```
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║                    ⚠  P1 INCIDENT                                ║
║              Payment service degraded                            ║
║         error rate 70% · 47 orders failed                        ║
║                                                                  ║
║                    [Acknowledge]                                 ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

- `fixed inset-0 z-50`
- Background: `bg-critical/20 backdrop-blur-sm`
- Border: `border-2 border-critical`
- Title: `text-display text-critical font-bold animate-pulse`
- Audio: `new Audio('/sounds/alert.mp3').play()` on mount; fallback "🔊 click to enable audio" if autoplay blocked

---

### 8.12 CMDB Entity Grid (`/cmdb`)

```
┌──────────────────────────────────────────────────────────────────┐
│  [All types ▾]  [Health: all ▾]  [Namespace ▾]  [Search…]       │
├────────────────┬────────────────┬────────────────┬───────────────┤
│ ⬡ payment-svc  │ ⬡ order-svc    │ ⬡ inventory-svc│ ⬡ notif-svc   │
│ ● critical     │ ● healthy      │ ● degraded     │ ● healthy     │
│ service        │ service        │ service        │ service       │
│ production     │ production     │ production     │ production    │
│ last seen: now │ last seen: now │ last seen: now │ last seen: now│
├────────────────┼────────────────┼────────────────┼───────────────┤
│ □ node-1       │ □ node-2       │ □ node-3       │               │
│ ● healthy      │ ● healthy      │ ● degraded     │               │
│ host           │ host           │ host           │               │
└────────────────┴────────────────┴────────────────┴───────────────┘
```

- Card: `p-4 rounded-xl bg-surface-1 border border-border hover:border-accent/40`
- Type icons (lucide): Service→`Layers`, Host→`Server`, Pod→`Box`, DB→`Database`, Container→`Container`

---

## 9. Iconography

Use **lucide-react** throughout. `strokeWidth={1.5}` everywhere — never the default 2.

| Domain | Icon |
|---|---|
| Incident | `AlertTriangle` |
| Change / RFC | `GitBranch` |
| Problem | `Bug` |
| Service / topology | `Layers` |
| Metrics | `TrendingUp` |
| Traces | `GitMerge` |
| Logs | `ScrollText` |
| Kubernetes | `Box` |
| Alert | `Bell` |
| CMDB | `Database` |
| Synthetic | `Globe` |
| Knowledge Base | `BookOpen` |
| AI Copilot | `Sparkles` |
| Healthy | `CheckCircle2` |
| Degraded | `AlertCircle` |
| Critical | `XCircle` |
| Unknown | `HelpCircle` |

---

## 10. Notification + Toast System

Use **sonner** (`<Toaster position="bottom-right" />`).

```tsx
// Incident created
toast.info('New P2 incident: Inventory latency spike', {
  action: { label: 'View', onClick: () => router.push('/incidents/…') }
})

// RCA ready
toast.success('AI RCA complete — 91% confidence', {
  description: 'Root cause: payment-db connection pool',
  action: { label: 'View RCA', onClick: () => router.push('…') }
})

// SLA breach
toast.error('SLA breached: Payment service degraded', {
  duration: Infinity,  // must be manually dismissed
})
```

---

## 11. Demo Control Panel

Visible only when `DEMO_MODE=true`. Fixed bottom-right, `z-40`.

```
┌──────────────────────────────────────────────┐
│  Demo Control                           [–]  │
│  ──────────────────────────────────────────  │
│  [💳 Payment Failure]  [📦 Inventory Storm]  │
│  [🔥 Cascade Failure]  [✅ Stop Chaos]        │
└──────────────────────────────────────────────┘
```

- `fixed bottom-6 right-6 w-64 bg-surface-2 border border-border rounded-xl p-4`
- Each button: `w-full text-left text-small` variant by severity (payment=critical, inventory=warning, cascade=critical, stop=success)

---

## 12. Accessibility Rules

- All interactive elements: `focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background`
- Color never the only differentiator — always pair with icon or text label
- All severity/health states use both color and icon
- Minimum contrast 4.5:1 for body text, 3:1 for large text
- All tables have proper `<th scope="col">` headers
- `aria-live="polite"` on the alert ticker and socket-driven count badges
- `prefers-reduced-motion`: wrap all Framer Motion with `useReducedMotion()` check
