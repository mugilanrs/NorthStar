# NorthStar — Frontend & Backend Architecture

> **Frontend:** Impeccable Operate-mode design system · shadcn/ui · Tailwind · Framer Motion
> **Backend:** Deep-module architecture · FastAPI · SQLAlchemy async · Celery · Adapter pattern

---

## Part 1 — Global Frontend Rules

Every slice inherits these rules. No exceptions without a written reason.

---

### 1.1 Design Mode: Operate

NorthStar is an **Operate** surface — engineers complete high-stakes tasks under pressure.
Design decisions rank in this order: **scanability → consistency → native expectations → expression**.
Brand lives in precise details, never in decoration that competes with data.

---

### 1.2 Design Tokens (Tailwind CSS Variables)

Define once in `globals.css`, consumed everywhere via Tailwind utilities.

```css
/* globals.css */
@layer base {
  :root {
    /* Surface */
    --background:        10 13 26;      /* #0A0D1A  deep navy */
    --surface-1:         15 20 40;      /* #0F1428  card bg */
    --surface-2:         20 28 55;      /* #141C37  elevated panel */
    --surface-3:         26 36 70;      /* #1A2446  hover state */
    --border:            38 50 90;      /* #263256  subtle border */

    /* Brand */
    --accent:            34 211 238;    /* #22D3EE  cyan-400  */
    --accent-dim:         6 182 212;    /* #06B6D4  cyan-500  */
    --accent-glow:       103 232 249;   /* #67E8F9  cyan-300  */

    /* Semantic */
    --success:           34 197  94;    /* #22C55E  green */
    --warning:          251 191  36;    /* #FBBF24  amber */
    --critical:         239  68  68;    /* #EF4444  red */
    --critical-pulse:   220  38  38;    /* #DC2626  P1 banner */

    /* Text */
    --foreground:       241 245 249;    /* #F1F5F9  primary text */
    --muted:            100 116 139;    /* #64748B  secondary text */
    --subtle:            51  65  85;    /* #334155  placeholder */

    /* Chart palette — fixed order, never swap */
    --chart-1:           59 130 246;    /* blue   */
    --chart-2:           34 197  94;    /* green  */
    --chart-3:          251 191  36;    /* amber  */
    --chart-4:          168  85 247;    /* purple */
    --chart-5:          239  68  68;    /* red    */
  }
}
```

`tailwind.config.ts` maps every token:

```ts
colors: {
  background: 'rgb(var(--background) / <alpha-value>)',
  surface:    { 1: 'rgb(var(--surface-1) / ...)', 2: '...', 3: '...' },
  accent:     { DEFAULT: 'rgb(var(--accent) / ...)', dim: '...', glow: '...' },
  success:    'rgb(var(--success) / ...)',
  warning:    'rgb(var(--warning) / ...)',
  critical:   { DEFAULT: 'rgb(var(--critical) / ...)', pulse: '...' },
  border:     'rgb(var(--border) / ...)',
  fg:         { DEFAULT: 'rgb(var(--foreground) / ...)', muted: '...', subtle: '...' },
  chart:      { 1: '...', 2: '...', 3: '...', 4: '...', 5: '...' },
}
```

---

### 1.3 Typography

| Token | Size | Weight | Usage |
|---|---|---|---|
| `text-display` | 28px / 1.2 | 700 | Page titles |
| `text-heading` | 20px / 1.3 | 600 | Section headings |
| `text-subheading` | 14px / 1.4 | 600 | Card headers, labels |
| `text-body` | 14px / 1.5 | 400 | Body copy |
| `text-small` | 12px / 1.4 | 400 | Metadata, timestamps |
| `text-mono` | 13px / 1.5 | 400 | Trace IDs, PromQL, log lines |

Font: **Inter** (display, body) + **JetBrains Mono** (code/data).

```ts
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace'],
}
```

---

### 1.4 Layout System

```
┌─────────────────────────────────────────────────────┐
│  Topbar (48px)  — breadcrumb · search · notif · user │
├──────────┬──────────────────────────────────────────┤
│          │                                           │
│ Sidebar  │   Main Content Area                       │
│  220px   │   flex-1, overflow-y-auto                 │
│ collapsed│   padding: 24px                           │
│  48px    │                                           │
│          │                                           │
└──────────┴──────────────────────────────────────────┘
```

- Sidebar collapses to icon-only at `lg:` breakpoint and below
- Main content max-width: `max-w-screen-2xl mx-auto`
- Page grid: `grid grid-cols-1 gap-6` → `lg:grid-cols-12`
- Cards always use `rounded-xl border border-border bg-surface-1`

---

### 1.5 Component Rules

#### Status Badges
Always use the same 4-state system. Never invent new states.

```tsx
const healthVariants = {
  healthy:  'bg-success/15 text-success border-success/30',
  degraded: 'bg-warning/15 text-warning border-warning/30',
  critical: 'bg-critical/15 text-critical border-critical/30',
  unknown:  'bg-muted/15 text-muted border-muted/30',
}
```

#### SLA Countdown Badge
```tsx
// > 30 min: muted  |  ≤ 30 min: warning  |  ≤ 15 min: critical + pulse animation
const slaClass = minsLeft > 30 ? 'text-muted'
               : minsLeft > 15 ? 'text-warning'
               : 'text-critical animate-pulse'
```

#### Severity Pills
```
P1 → bg-critical/20 text-critical    font-semibold
P2 → bg-warning/20  text-warning     font-semibold
P3 → bg-accent/20   text-accent
P4 → bg-muted/20    text-muted
```

#### Loading States
All async data → `<Skeleton>` from shadcn/ui. Never show blank panels or spinners in center of content.

```tsx
// Pattern: render skeleton at same height as real content
<Skeleton className="h-[200px] w-full rounded-xl" />
```

#### Empty States
Every list view must have a designed empty state — not just "No data."

```tsx
<EmptyState
  icon={<ActivityIcon className="text-muted" />}
  title="No incidents"
  description="All services are healthy"
/>
```

---

### 1.6 Data Fetching Patterns

**React Query** for all server state. **Zustand** for UI state only (sidebar open, selected entity, active filters).

```ts
// Standard query pattern
const { data, isLoading } = useQuery({
  queryKey: ['incidents', filters],
  queryFn:  () => api.incidents.list(filters),
  staleTime: 30_000,
  refetchInterval: 30_000,  // live refresh for dashboard data
})

// Socket.IO invalidation
socket.on('incident_created', () => {
  queryClient.invalidateQueries({ queryKey: ['incidents'] })
})
```

**Never** fetch inside components. All fetching lives in `hooks/use-*.ts` files.

---

### 1.7 Animation Rules (Framer Motion)

| Animation | Duration | Easing | Usage |
|---|---|---|---|
| Page enter | 200ms | `easeOut` | Every route change |
| Card mount | 150ms + stagger 40ms | `easeOut` | List items rendering |
| KPI counter | 800ms | `easeInOut` | Number animations |
| Alert pulse | 1000ms loop | `easeInOut` | P1 banner, SLA badge |
| Topology node | 300ms spring | `spring(stiffness:200)` | Health state changes |

**Rule:** Motion serves information, never decoration. Every animation must communicate state change or guide attention.

```tsx
// Standard list stagger
const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const item      = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }
```

---

### 1.8 Chart Rules (Recharts)

- Background: transparent (inherits `surface-1`)
- Grid lines: `stroke="rgb(var(--border))" strokeDasharray="3 3"`
- Tooltip: custom `<ChartTooltip>` with `bg-surface-2 border-border`
- All time axes: relative ("2m ago") not absolute timestamps in sparklines
- No chart legends inside the chart area — use external labels
- Responsive wrapper: always `<ResponsiveContainer width="100%" height={200}>`

---

### 1.9 File Structure (Frontend)

```
frontend/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx             # sidebar + topbar shell
│   │   ├── page.tsx               # Ops Center dashboard
│   │   ├── services/page.tsx      # topology map
│   │   ├── metrics/page.tsx
│   │   ├── traces/page.tsx
│   │   ├── logs/page.tsx
│   │   ├── kubernetes/page.tsx
│   │   ├── alerts/page.tsx
│   │   ├── incidents/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── changes/page.tsx
│   │   ├── problems/page.tsx
│   │   ├── cmdb/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── synthetic/page.tsx
│   │   ├── knowledge-base/page.tsx
│   │   └── ai-copilot/page.tsx
├── components/
│   ├── ui/                        # shadcn/ui (never edit directly)
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── topbar.tsx
│   │   └── p1-banner.tsx
│   ├── charts/
│   │   ├── sparkline.tsx
│   │   ├── area-chart.tsx
│   │   ├── trace-waterfall.tsx
│   │   └── topology-graph.tsx     # D3
│   ├── shared/
│   │   ├── health-badge.tsx
│   │   ├── severity-pill.tsx
│   │   ├── sla-badge.tsx
│   │   ├── entity-link.tsx
│   │   ├── empty-state.tsx
│   │   └── skeleton-card.tsx
│   └── [slice]/                   # slice-specific components
├── hooks/
│   ├── use-socket.ts
│   ├── use-incidents.ts
│   ├── use-entities.ts
│   ├── use-topology.ts
│   └── ...
├── lib/
│   ├── api.ts                     # typed API client (fetch wrapper)
│   ├── socket.ts                  # Socket.IO singleton
│   └── utils.ts
└── store/
    ├── ui.ts                      # sidebar, command palette state
    └── demo.ts                    # chaos mode trigger state
```

---

## Part 2 — Global Backend Rules

Every slice inherits these patterns. Deviating requires a written reason in the slice spec.

---

### 2.1 Module Depth Principle

From `improve-codebase-architecture`: every module must pass the **deletion test** — deleting it must concentrate complexity, not just move it. Shallow modules (interface ≈ implementation) are refactored into deeper ones.

**Three-layer rule per slice:**
```
Router  (thin)   →  validates input, delegates, returns response
Service (deep)   →  all business logic, orchestrates adapters
Adapter (seam)   →  one adapter per external system
```

The service layer is the test surface. Routers are never tested directly. Adapters are swappable behind interfaces.

---

### 2.2 File Structure (Backend)

```
backend/
├── main.py                         # app factory, CORS, lifespan
├── core/
│   ├── config.py                   # pydantic-settings, all env vars
│   ├── database.py                 # async engine + session factory
│   ├── redis.py                    # Upstash connection + pub/sub
│   └── security.py                 # JWT, password hashing
├── models/                         # SQLAlchemy ORM models (one file per domain)
│   ├── itsm.py                     # User, Incident, Change, Problem, SlaPolicy
│   └── observability.py            # Entity, TopologyEdge, AlertRule, Alert, Synthetic*
├── schemas/                        # Pydantic request/response schemas
│   ├── incidents.py
│   ├── entities.py
│   └── ...
├── routers/                        # FastAPI routers (thin — no logic)
│   ├── auth.py
│   ├── incidents.py
│   ├── changes.py
│   ├── entities.py
│   ├── topology.py
│   ├── metrics.py                  # proxy to Grafana Cloud
│   ├── traces.py                   # proxy to Grafana Cloud Tempo
│   ├── logs.py                     # proxy to Grafana Cloud Loki
│   ├── alerts.py
│   ├── synthetic.py
│   ├── ai.py
│   └── dashboard.py
├── services/                       # deep modules — all business logic lives here
│   ├── incident_service.py
│   ├── change_service.py
│   ├── sla_service.py
│   ├── entity_service.py
│   ├── topology_service.py
│   ├── alert_service.py
│   ├── ai_service.py
│   └── synthetic_service.py
├── adapters/                       # one file per external system
│   ├── grafana.py                  # metrics (PromQL) + traces (Tempo) + logs (Loki)
│   ├── groq.py                     # LLM completions + streaming
│   └── socket_emitter.py           # Socket.IO event dispatch
├── workers/                        # Celery tasks
│   ├── celery_app.py
│   ├── entity_discovery.py
│   ├── topology_builder.py
│   ├── alert_evaluator.py
│   ├── anomaly_detector.py
│   ├── correlation_engine.py
│   ├── sla_sweeper.py
│   └── digest_generator.py
├── socketio_app.py                 # Socket.IO ASGI app + event handlers
└── alembic/                        # migrations
```

---

### 2.3 Adapter Pattern (Seam Rule)

Every external system gets exactly one adapter. The adapter owns the HTTP client, retries, error mapping, and env vars. Nothing outside the adapter imports `httpx` or calls external URLs.

```python
# adapters/grafana.py  — the seam for all Grafana Cloud calls
class GrafanaAdapter:
    def __init__(self, base_url: str, api_key: str): ...

    async def query_range(self, query: str, start: int, end: int, step: str) -> dict: ...
    async def search_traces(self, service: str, limit: int) -> list[dict]: ...
    async def query_logs(self, logql: str, limit: int) -> list[dict]: ...
```

Dependency-injected via FastAPI `Depends()`:

```python
# core/deps.py
def get_grafana() -> GrafanaAdapter:
    return GrafanaAdapter(settings.GRAFANA_URL, settings.GRAFANA_API_KEY)

# routers/metrics.py
@router.get("/query_range")
async def query_range(q: str, grafana: GrafanaAdapter = Depends(get_grafana)):
    return await grafana.query_range(q, ...)
```

---

### 2.4 Service Layer Rules

Services are the deep modules. They:
- Take typed Pydantic inputs, return typed Pydantic outputs
- Own all business logic: SLA computation, state machines, deduplication
- Call adapters, not routers or other services directly
- Are async throughout (`async def`)
- Raise typed domain exceptions (`IncidentNotFoundError`, `SlaBreachError`)

```python
# services/incident_service.py
class IncidentService:
    def __init__(self, db: AsyncSession, grafana: GrafanaAdapter, emitter: SocketEmitter): ...

    async def create(self, data: IncidentCreate, actor: User) -> Incident: ...
    async def escalate(self, incident_id: UUID, actor: User) -> Incident: ...
    async def compute_sla_breach_at(self, incident: Incident) -> datetime: ...
```

---

### 2.5 Celery Worker Rules

- Each worker task is a thin wrapper that calls a service method
- Workers share the same service/adapter code as the API
- Beat schedule lives in `celery_app.py`, not scattered across worker files
- All tasks are idempotent (safe to re-run)

```python
# workers/alert_evaluator.py
@celery_app.task(bind=True, max_retries=3)
def evaluate_alert_rules(self):
    asyncio.run(_evaluate())

async def _evaluate():
    async with get_db_session() as db:
        service = AlertService(db, get_grafana(), get_socket_emitter())
        await service.evaluate_all_active_rules()
```

---

### 2.6 Socket.IO Events

All real-time pushes go through `adapters/socket_emitter.py`. Services call the emitter; the emitter calls Socket.IO. Nothing else touches Socket.IO directly.

```python
# adapters/socket_emitter.py
class SocketEmitter:
    async def incident_created(self, incident: Incident): ...
    async def p1_alert(self, alert: Alert): ...
    async def rca_ready(self, incident_id: UUID, rca: RcaResult): ...
    async def metrics_update(self, snapshot: DashboardMetrics): ...
```

---

## Part 3 — Per-Slice Architecture

---

### Slice 0 — Scaffold

#### Backend
| File | What it contains |
|---|---|
| `main.py` | `create_app()` factory: CORS, routers, Socket.IO mount, lifespan (DB connect/disconnect) |
| `core/config.py` | All env vars via pydantic-settings: `DATABASE_URL`, `REDIS_URL`, `GRAFANA_*`, `GROQ_API_KEY` |
| `core/database.py` | `AsyncEngine`, `async_session_maker`, `get_db` dependency |
| `routers/auth.py` | `POST /auth/login` → JWT issue; `GET /auth/me` |
| `alembic/` | Initial migration: all tables from PLAN.md schema |
| `workers/celery_app.py` | Celery app factory + beat schedule skeleton |

**Done when:** `GET /health` → `{"status":"ok"}` on Railway; Alembic migrations apply clean; `POST /auth/login` returns JWT.

#### Frontend
| File | What it contains |
|---|---|
| `app/(dashboard)/layout.tsx` | `<Sidebar>` + `<Topbar>` + `<P1Banner>` + `{children}` |
| `components/layout/sidebar.tsx` | Nav items with icons, active state, collapse toggle; Framer Motion slide animation |
| `components/layout/topbar.tsx` | Breadcrumb, Cmd+K trigger, notification bell (badge count from Zustand), user avatar |
| `components/layout/p1-banner.tsx` | Full-width red banner, audio trigger, dismiss; subscribes to `p1_alert` socket event |
| `lib/api.ts` | `fetch` wrapper with JWT header injection, typed response generics |
| `lib/socket.ts` | Socket.IO singleton, auto-reconnect, typed event emitter |
| `app/(auth)/login/page.tsx` | Login form, `react-hook-form` + zod, JWT stored in httpOnly cookie |

**Design spec:**
- Sidebar: `w-[220px]` expanded, `w-[48px]` collapsed; `bg-surface-1 border-r border-border`
- Nav items: icon + label, `hover:bg-surface-3 rounded-lg mx-2 px-3 py-2`
- Active state: `bg-accent/10 text-accent border-l-2 border-accent`
- Topbar: `h-12 bg-surface-1/80 backdrop-blur border-b border-border`

---

### Slice 1 — Entity Discovery + CMDB

#### Backend
| Module | Depth | What it does |
|---|---|---|
| `services/entity_service.py` | **Deep** | `upsert_from_otel_attrs()` deduplicates by `(name, entity_type, namespace)`; `evaluate_health()` queries Grafana for error rate + latency → sets `health_status` |
| `workers/entity_discovery.py` | Thin | Celery beat every 30s: calls `entity_service.discover_from_metrics()` |
| `adapters/grafana.py` | Seam | `get_label_values(match)` → unique service names from Grafana Cloud |
| `routers/entities.py` | Thin | `GET /entities`, `GET /entities/{id}`, `GET /entities/{id}/metrics` |
| `schemas/entities.py` | — | `EntityOut`, `EntityDetail`, `HealthStatus` enum |

**Key service interface:**
```python
class EntityService:
    async def discover_from_metrics(self) -> list[Entity]
    async def evaluate_health(self, entity: Entity) -> HealthStatus
    async def get_detail(self, entity_id: UUID) -> EntityDetail
```

#### Frontend
| Component | Description |
|---|---|
| `app/(dashboard)/cmdb/page.tsx` | Grid of `<EntityCard>` components; filter bar (type, health, namespace) |
| `components/cmdb/entity-card.tsx` | Icon by type (server/container/db/pod), health badge, name, namespace, `last_seen_at` |
| `components/cmdb/entity-detail.tsx` | Tabbed panel: Overview · Metrics · Traces · Incidents · Attributes |
| `components/shared/health-badge.tsx` | `healthy/degraded/critical/unknown` with colored dot + label |
| `hooks/use-entities.ts` | React Query; invalidates on `entity_health_changed` socket event |

**Design spec:**
- Entity grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4`
- Card: `p-4 rounded-xl bg-surface-1 border border-border hover:border-accent/50 transition-colors cursor-pointer`
- Health dot: `w-2.5 h-2.5 rounded-full` — green/amber/red/grey; critical state adds `animate-pulse`
- Entity type icons: use `lucide-react` — Server, Container, Database, Box, Cloud

---

### Slice 2 — Metrics Explorer

#### Backend
| Module | Depth | What it does |
|---|---|---|
| `adapters/grafana.py` | Seam | `query_instant(promql)`, `query_range(promql, start, end, step)`, `get_label_names()`, `get_label_values(label)` |
| `routers/metrics.py` | Thin | Pure proxy endpoints; no transformation — Grafana Cloud response passed through |
| `services/entity_service.py` | **Deep** | `get_golden_signals(entity)` → returns pre-built PromQL queries by entity type |

**Golden signals by entity type:**
```python
GOLDEN_SIGNALS = {
  "service": {
    "latency_p99": 'histogram_quantile(0.99, rate(http_server_duration_bucket{{service_name="{name}"}}[5m]))',
    "error_rate":  'rate(http_server_request_count{{service_name="{name}",status_code=~"5.."}}[5m])',
    "rps":         'rate(http_server_request_count{{service_name="{name}"}}[5m])',
  }
}
```

#### Frontend
| Component | Description |
|---|---|
| `app/(dashboard)/metrics/page.tsx` | PromQL input, time range picker, chart output |
| `components/charts/area-chart.tsx` | Recharts `<AreaChart>` with gradient fill; tooltip with exact value + timestamp |
| `components/charts/sparkline.tsx` | 60px tall inline chart for cards and tables |
| `components/metrics/promql-input.tsx` | Textarea with label autocomplete (React Query fetched from `/metrics/labels`) |
| `components/metrics/time-range-picker.tsx` | Preset buttons (15m/1h/3h/24h/7d) + custom range |
| `hooks/use-metrics.ts` | `useQueryRange(promql, range)` — React Query with 30s refetch |

**Design spec:**
- Metrics page layout: `grid lg:grid-cols-[300px_1fr] gap-6`
- Left panel: PromQL input + label explorer
- Right panel: chart fills remaining width; `h-64` default, resizable via drag handle
- Chart gradient: `from-accent/20 to-transparent`
- Entity detail "Metrics" tab: 2×2 grid of golden signal charts, each `h-40`

---

### Slice 3 — Service Topology Map

#### Backend
| Module | Depth | What it does |
|---|---|---|
| `services/topology_service.py` | **Deep** | `build_from_traces()` queries Tempo for spans with parent IDs → extracts call edges → upserts `topology_edges` with call count, error rate, avg latency |
| `workers/topology_builder.py` | Thin | Celery beat every 60s → `topology_service.build_from_traces()` |
| `routers/topology.py` | Thin | `GET /topology` → `{nodes, edges}`; `GET /topology/{id}/neighbors` |
| `schemas/topology.py` | — | `TopologyNode(id, name, health, metrics)`, `TopologyEdge(source, target, rps, error_rate, latency_ms)` |

**Topology response shape:**
```python
class TopologyGraph(BaseModel):
    nodes: list[TopologyNode]
    edges: list[TopologyEdge]
    generated_at: datetime
```

#### Frontend
| Component | Description |
|---|---|
| `app/(dashboard)/services/page.tsx` | Full-page D3 topology canvas + side panel |
| `components/charts/topology-graph.tsx` | D3 force-directed graph: nodes colored by health, edges labeled with RPS + latency |
| `components/topology/service-side-panel.tsx` | Slides in on node click: entity name, health badge, 3 golden signal sparklines, active incident count, "View Traces" link |
| `components/topology/blast-radius-toggle.tsx` | Toggle that highlights downstream nodes + dims unaffected ones |
| `hooks/use-topology.ts` | React Query; invalidates on `topology_updated` socket event |

**Design spec:**
- Canvas: `w-full h-[calc(100vh-8rem)] bg-surface-1 rounded-xl border border-border`
- Node: `r=28` circle; fill by health (`success/warning/critical` token); label below in `text-small font-mono`
- Edge: `stroke-width=2`; healthy=`border` color; degraded=`warning`; error_rate>5%=`critical`; animated dash on `critical`
- Side panel: `absolute right-0 top-0 w-80 h-full bg-surface-2 border-l border-border` — slides in with Framer Motion

---

### Slice 4 — Trace Viewer

#### Backend
| Module | Depth | What it does |
|---|---|---|
| `adapters/grafana.py` | Seam | `search_traces(service, status, min_duration, limit)`, `get_trace(trace_id)` → full span tree |
| `routers/traces.py` | Thin | `GET /traces/search`, `GET /traces/{trace_id}` — pure proxy with light response normalization |
| `services/entity_service.py` | **Deep** | `link_trace_to_entity(trace)` → attaches entity record to trace response |

**Span normalization** (one model both UI and backend use):
```python
class Span(BaseModel):
    span_id:    str
    parent_id:  str | None
    service:    str
    operation:  str
    start_ms:   int
    duration_ms: int
    status:     Literal['ok', 'error', 'unset']
    attributes: dict
```

#### Frontend
| Component | Description |
|---|---|
| `app/(dashboard)/traces/page.tsx` | Search bar (service, status, duration filter) + results list |
| `components/traces/trace-search-result.tsx` | Row: service name, root span operation, duration badge, error badge, timestamp, `trace_id` (truncated + copy button) |
| `components/traces/trace-waterfall.tsx` | Recharts `<BarChart>` horizontal Gantt; each row = one span; colored by service; error spans in `critical` red |
| `components/traces/span-detail.tsx` | Click span → drawer with all attributes, `db.statement` if present, "View Logs" button |
| `hooks/use-traces.ts` | `useTraceSearch(filters)`, `useTrace(traceId)` |

**Design spec:**
- Waterfall row height: `h-8`; service color from `chart-N` token (deterministic by service name hash)
- Duration bar: relative to total trace duration; root span = full width
- Error span: `bg-critical/30 border border-critical`
- Span detail drawer: `w-[480px]` from right; `font-mono text-small` for attribute values

---

### Slice 5 — Log Explorer

#### Backend
| Module | Depth | What it does |
|---|---|---|
| `adapters/grafana.py` | Seam | `query_logs(logql, start, end, limit)`, `get_log_labels()`, `tail_logs(logql)` → SSE stream |
| `routers/logs.py` | Thin | `GET /logs/query`, `GET /logs/labels`, `GET /logs/tail` (SSE) |
| `services/incident_service.py` | **Deep** | `get_incident_logs(incident)` → auto-builds LogQL from entity + time window |

#### Frontend
| Component | Description |
|---|---|
| `app/(dashboard)/logs/page.tsx` | LogQL input + label autocomplete + results |
| `components/logs/log-line.tsx` | Severity icon, timestamp (`font-mono text-small`), service badge, message; expand → full JSON |
| `components/logs/severity-icon.tsx` | Colored icon: DEBUG=muted, INFO=accent, WARN=warning, ERROR=critical |
| `components/logs/trace-link.tsx` | If log has `trace_id` attribute → button "View Trace" → navigates to trace waterfall |
| `components/logs/live-tail.tsx` | SSE consumer; auto-scrolls to bottom; pause button |
| `hooks/use-logs.ts` | `useLogQuery(logql, range)`, `useLogTail(logql)` |

**Design spec:**
- Log list: `font-mono text-[13px]` — readability is the only goal
- Log row background by severity: `bg-transparent` (debug/info), `bg-warning/5` (warn), `bg-critical/5` (error)
- Expanded JSON: `bg-surface-2 rounded-lg p-4 mt-1 text-small font-mono` with syntax highlight via `prism-react-renderer`

---

### Slice 6 — Kubernetes Overview

#### Backend
| Module | Depth | What it does |
|---|---|---|
| `services/entity_service.py` | **Deep** | K8s entities auto-discovered from OTel `k8s.*` resource attributes; `get_k8s_summary()` aggregates pod/node metrics from Grafana |
| `routers/entities.py` | Thin | `GET /kubernetes/namespaces`, `GET /kubernetes/pods`, `GET /kubernetes/nodes` |
| `schemas/entities.py` | — | `K8sPodSummary`, `K8sNodeSummary`, `K8sNamespaceSummary` |

#### Frontend
| Component | Description |
|---|---|
| `app/(dashboard)/kubernetes/page.tsx` | Namespace selector tabs → node cards → pod table |
| `components/k8s/node-card.tsx` | CPU bar, memory bar, pod count, health badge |
| `components/k8s/pod-table.tsx` | Name, namespace, status, restarts (red badge if > 3), age, `OOMKilled` tag |
| `components/k8s/create-incident-button.tsx` | Appears on CrashLoopBackOff/OOMKill rows; pre-fills incident form with pod entity |
| `hooks/use-kubernetes.ts` | React Query; 15s refetch interval |

**Design spec:**
- Node card: `p-5 rounded-xl bg-surface-1 border border-border`
- CPU/memory bar: `bg-surface-3 rounded-full h-2`; fill: green < 70%, amber 70–90%, red > 90%
- Restart badge: `bg-critical/15 text-critical text-xs font-mono px-1.5 rounded` if restarts > 3
- CrashLoopBackOff row: `bg-critical/5 border-l-2 border-critical`

---

### Slice 7 — Alert Rules Engine

#### Backend
| Module | Depth | What it does |
|---|---|---|
| `services/alert_service.py` | **Deep** | `evaluate_rule(rule)` → queries Grafana → compares threshold → creates `Alert` with dedup fingerprint; `auto_create_incident()` if rule configured |
| `workers/alert_evaluator.py` | Thin | Celery beat every 30s → `alert_service.evaluate_all_active_rules()` |
| `routers/alerts.py` | Thin | `GET/POST /alerts`, `GET/POST /alert-rules`, `POST /alerts/webhook` |
| `adapters/socket_emitter.py` | Seam | `p1_alert()` emits to namespace `/dashboard` → triggers frontend banner |

**Dedup fingerprint:**
```python
fingerprint = sha256(f"{rule.id}:{entity.id}:{alert.severity}").hexdigest()[:16]
# Dedup window: don't re-fire same fingerprint within rule.window_minutes
```

#### Frontend
| Component | Description |
|---|---|
| `app/(dashboard)/alerts/page.tsx` | Alert feed table + Alert Rules management tab |
| `components/alerts/alert-row.tsx` | Severity pill, entity link, title, duration (`"firing for 12m"`), linked incident chip |
| `components/alerts/alert-rules-form.tsx` | PromQL input, threshold, window, severity, auto-incident toggle |
| `components/alerts/alert-feed-ticker.tsx` | Horizontal scrolling ticker on dashboard showing last 5 alerts |
| `components/layout/p1-banner.tsx` | Full-screen red overlay; `animate-pulse`; audio (`new Audio('/sounds/alert.mp3').play()`); dismiss resets state |
| `hooks/use-alerts.ts` | React Query + socket invalidation on `alert_received` |

**P1 Banner design:**
```tsx
// Fixed position, z-50, full screen overlay
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  className="fixed inset-0 z-50 bg-critical/20 border-2 border-critical
             flex flex-col items-center justify-center backdrop-blur-sm"
>
  <div className="text-critical text-display font-bold animate-pulse">P1 INCIDENT</div>
  <p className="text-critical/80 text-heading mt-2">{alert.title}</p>
  <Button variant="outline" className="mt-6 border-critical text-critical" onClick={dismiss}>
    Acknowledge
  </Button>
</motion.div>
```

---

### Slice 8 — ITSM Core

#### Backend
| Module | Depth | What it does |
|---|---|---|
| `services/incident_service.py` | **Deep** | Full lifecycle: create, update, escalate, resolve; `compute_sla_breach_at()`; activity log on every mutation; `get_incident_logs()` auto-queries Loki |
| `services/change_service.py` | **Deep** | RFC state machine (`draft→pending_approval→approved→in_progress→completed`); role-gated approval; freeze window check |
| `services/sla_service.py` | **Deep** | `evaluate_breach_probability()` for Slice 9e; `sweep_breached()` Celery task |
| `workers/sla_sweeper.py` | Thin | Celery beat every 5 min → marks `sla_breached` on overdue incidents; emits `sla_breach` socket event |
| `routers/incidents.py` | Thin | Full CRUD + `POST /{id}/escalate` + `GET /{id}/timeline` |
| `routers/changes.py` | Thin | Full CRUD + `POST /{id}/approve` + `POST /{id}/reject` |

**SLA state machine:**
```
P1: 1h response SLA, 4h resolution SLA
P2: 4h response SLA, 24h resolution SLA
P3: 8h response SLA, 72h resolution SLA
sla_breach_at = created_at + resolution_sla_for_priority
```

#### Frontend
| Component | Description |
|---|---|
| `app/(dashboard)/incidents/page.tsx` | Table: priority, title, entity link, SLA badge, assignee, status; sort + filter |
| `components/incidents/sla-badge.tsx` | Live countdown timer; color transitions at 30m/15m; `animate-pulse` at <15m |
| `components/incidents/activity-timeline.tsx` | Vertical timeline; each entry has icon by type (comment/escalation/AI/system), timestamp, actor avatar |
| `components/incidents/incident-tabs.tsx` | Overview · Traces · Logs · Related Entities · AI RCA |
| `app/(dashboard)/changes/page.tsx` | RFC list + status stepper |
| `components/changes/rfc-form.tsx` | Multi-step wizard (shadcn `<Dialog>`): Details → Scope → Rollback Plan → Review |
| `components/changes/approval-flow.tsx` | 3-step stepper: Submitter ✓ → CAB Review → Implementer; role-gated approve/reject buttons |
| `hooks/use-incidents.ts` | React Query; invalidates on `incident_created`, `incident_updated` |

**Incident table design:**
- Priority column: fixed 48px; severity pill only
- SLA column: `<SlaCountdownBadge>` — ticks every second via `useEffect` + `setInterval`
- Row hover: `hover:bg-surface-3 cursor-pointer` → navigate to detail

---

### Slice 9 — AI Ops Engine

#### Backend
| Module | Depth | What it does |
|---|---|---|
| `services/ai_service.py` | **Deep** | `run_rca(incident_id)`: fetches metrics window + traces + logs → MULAN fusion → RUN Granger → writes result to incident; `stream_copilot(query, context)`: builds system prompt with live platform state → streams Groq response |
| `services/alert_service.py` | Extended | Anomaly detection integration: `evaluate_anomaly_scores()` calls metric anomaly model |
| `workers/anomaly_detector.py` | Thin | Celery beat every 2 min → ISOLATE metric anomaly scan; LogGPT log scan |
| `workers/correlation_engine.py` | Thin | Celery every 5 min → sentence-transformers clustering → auto-problem creation |
| `adapters/groq.py` | Seam | `complete(messages, model)`, `stream(messages, model)` → SSE; handles rate limits + retry |

**RCA pipeline (service method):**
```python
async def run_rca(self, incident_id: UUID) -> RcaResult:
    incident = await self.incident_repo.get(incident_id)
    window   = TimeWindow(start=incident.created_at - timedelta(minutes=30), end=incident.created_at)

    metrics  = await self.grafana.query_range(build_metric_query(incident.entity), window)
    traces   = await self.grafana.search_traces(incident.entity.name, window)
    logs     = await self.grafana.query_logs(build_log_query(incident.entity), window)

    scores   = mulan_fusion(metrics, traces, logs)          # modality weighting
    causes   = run_granger_causality(metrics, scores)       # causal ranking
    result   = ensemble(scores, causes)                     # confidence + evidence
    
    await self.incident_repo.update_rca(incident_id, result)
    await self.emitter.rca_ready(incident_id, result)
    return result
```

**Copilot context injection:**
```python
system_prompt = f"""
You are NorthStar Ops Copilot. Current platform state:
- Active P1/P2 incidents: {active_incidents_summary}
- Alert feed (last 10): {alert_summary}
- RCA findings: {rca_summaries}
- Topology health: {topology_health_summary}
- Upcoming RFCs (next 24h): {rfc_summary}
Answer concisely. Flag risk. Recommend action.
"""
```

#### Frontend
| Component | Description |
|---|---|
| `components/incidents/ai-rca-tab.tsx` | Confidence meter (0–100%), causal chain animated graph, evidence cards (metric snippet + trace link + log excerpt), modality weight bars |
| `components/ai/causal-chain-viz.tsx` | D3 directed graph: A→B→C chain; root cause node pulsing red; edge labels show lag time |
| `components/ai/copilot-drawer.tsx` | Right-side drawer (Cmd+Shift+A); SSE stream renders token-by-token; "Briefing" button sends fixed prompt; context chips shown below input |
| `components/ai/nl-search-bar.tsx` | Cmd+K palette: NL input → calls `/ai/nl-query` → shows generated query + results inline |
| `components/changes/risk-score-badge.tsx` | Green/amber/red shield icon + score; click → SHAP waterfall chart in tooltip |
| `hooks/use-copilot.ts` | SSE consumer via `EventSource`; streams tokens into a `ref` for smooth rendering |

**Copilot drawer design:**
```
┌──────────────────────────────────┐
│  NorthStar Copilot        Cmd+Shift+A │
│  ─────────────────────────────── │
│  Context: 2 P1s · 14 alerts · 3 RFCs│
│                                  │
│  [message stream renders here]   │
│                                  │
│  ─────────────────────────────── │
│  [input field]           [Send]  │
│  [Briefing]  [Safe to deploy?]   │
└──────────────────────────────────┘
```
- Drawer: `w-[420px] fixed right-0 top-0 h-full bg-surface-1 border-l border-border z-40`
- Framer Motion: `x: 420 → 0` slide on open
- Streaming text: `whitespace-pre-wrap font-sans text-body`

---

### Slice 10 — Synthetic Monitoring

#### Backend
| Module | Depth | What it does |
|---|---|---|
| `services/synthetic_service.py` | **Deep** | `run_check(check)`: async HTTP probe with timeout; stores result; triggers incident if 3 consecutive failures |
| `workers/synthetic_runner.py` | Thin | Celery beat every 60s → `synthetic_service.run_all_active_checks()` |
| `routers/synthetic.py` | Thin | CRUD for `synthetic_checks`; `GET /{id}/results` |

#### Frontend
| Component | Description |
|---|---|
| `app/(dashboard)/synthetic/page.tsx` | Grid of check cards |
| `components/synthetic/check-card.tsx` | URL, uptime % (last 24h), response time sparkline, status timeline (green/red 1px bars for last 100 checks) |
| `hooks/use-synthetic.ts` | React Query; 60s refetch |

---

### Slice 11 — Ops Intelligence Digest

#### Backend
| Module | Depth | What it does |
|---|---|---|
| `workers/digest_generator.py` | Thin | Celery beat every 8h → `ai_service.generate_digest()` |
| `services/ai_service.py` | Extended | `generate_digest()`: aggregates P1/P2 counts, SLA %, top incident types, top anomaly, top concern → Groq → structured digest stored in `digests` table |
| `routers/dashboard.py` | Extended | `GET /ai/digest` returns latest digest |

#### Frontend
| Component | Description |
|---|---|
| `components/dashboard/digest-panel.tsx` | Collapsible card on dashboard; 3-bullet AI summary; "Top Concern" chip at top; "Export HTML" button |
| `components/dashboard/top-concern-chip.tsx` | Amber chip: "AI Top Concern: payment-service SLA at risk" — always visible on dashboard topbar when concern exists |

---

### Slice 12 — Polish + Demo Hardening

#### Frontend Polish Checklist
- [ ] All list pages have designed empty states
- [ ] All async data shows skeleton at correct height
- [ ] All forms have validation error states (`text-critical text-small`)
- [ ] All interactive elements have focus rings (`focus-visible:ring-2 focus-visible:ring-accent`)
- [ ] Framer Motion page transitions on every route (`AnimatePresence` in root layout)
- [ ] KPI counters on dashboard animate on value change (`useMotionValue` + `useSpring`)
- [ ] Topology graph handles 0 nodes gracefully (empty state illustration)
- [ ] P1 banner tested with audio autoplay policy fallback (show "🔊 click to enable audio" if blocked)
- [ ] Mobile: sidebar collapses correctly at < 1024px; all tables are horizontally scrollable
- [ ] Sonner toasts on every socket event: incident created, RCA ready, SLA breach

#### Backend Polish Checklist
- [ ] All endpoints return consistent error shape: `{"error": "...", "code": "...", "detail": "..."}`
- [ ] Rate limiting on `/ai/*` endpoints (5 req/min per user via Redis)
- [ ] All Celery tasks have dead-letter logging on failure
- [ ] `seed_demo.py` idempotent (re-running doesn't duplicate data)
- [ ] Grafana adapter has circuit breaker (5 failures → 60s cooldown, returns cached data)
- [ ] All database queries use `SELECT ... LIMIT` — no unbounded queries

#### Data Generator Integration
| Endpoint | Purpose |
|---|---|
| `POST /demo/chaos/{mode}` | Backend proxies to data generator's chaos API; only enabled when `DEMO_MODE=true` |
| `GET /demo/status` | Returns active chaos mode + generator health |
| `POST /demo/reset` | Calls `chaos/stop` + resets any demo-seeded incidents to resolved |

**Demo control panel** (visible only when `DEMO_MODE=true`):
```
┌────────────────────────────────────────────┐
│  Demo Control                              │
│  ──────────────────────────────────────── │
│  [💳 Payment Failure]  [📦 Inventory Storm]│
│  [🔥 Cascade Failure]  [✅ Stop Chaos]     │
└────────────────────────────────────────────┘
```
Small fixed panel bottom-right; only shown in demo mode; each button calls `POST /demo/chaos/{mode}`.
