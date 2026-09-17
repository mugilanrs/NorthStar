# NorthStar — Unified Observability + ITSM Platform (MVP Plan)

## Context
Replace both **Xurrent** (enterprise ITSM: ITIL workflows, SLA, CMDB, service catalog) and **Dynatrace** (full-stack APM: metrics, traces, logs, topology maps, Davis AI) with a single open-source platform deployed entirely on free-tier cloud services — no proprietary agents, no vendor lock-in, no credit card required. The client is an Enterprise IT department running Kubernetes workloads on cloud (AWS/Azure/GCP) plus custom applications. All data collection via OpenTelemetry only. The live demo uses an **OTel Data Generator** — a single Railway service that emits realistic OTLP metrics, traces, and logs as if a 5-service e-commerce platform were running, with on-demand chaos injection and instant 7-day history backfill. No real application needed.

---

## What NorthStar Monitors

| Layer | How collected | Replaces |
|---|---|---|
| Application metrics (latency, error rate, throughput) | OTel SDK in apps → OTel Collector | Dynatrace APM |
| Distributed traces (request waterfalls, spans) | OTel SDK → OTel Collector → Tempo | Dynatrace PurePath |
| Logs (structured + unstructured) | OTel Collector log receivers | Dynatrace Log Monitoring |
| Kubernetes (pods, nodes, deployments, namespaces) | OTel Collector k8s receiver + k8s-events-receiver | Dynatrace K8s monitoring |
| Cloud infra (AWS/Azure/GCP) | OTel Collector cloud receivers (CloudWatch, Azure Monitor) | Dynatrace cloud monitoring |
| Service topology (dependency graph) | Derived from trace span relationships | Dynatrace Smartscape |
| CMDB entities | Auto-discovered from OTel resource attributes | Xurrent CMDB |
| Synthetic uptime checks | NorthStar Synthetic worker (configurable HTTP probes) | Dynatrace Synthetic |

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| **Frontend** | Next.js 14 + shadcn/ui + Tailwind | SSR, polished accessible components |
| **Charts** | Recharts + Tremor + D3 (topology graph) | Custom trace waterfalls, service maps |
| **State** | Zustand + React Query | Live dashboard via WebSocket + polling |
| **Backend** | FastAPI (Python 3.12) | Native async, AI libs, OTel SDK support |
| **ORM** | SQLAlchemy 2.0 async + Alembic | ITSM data, entities, alert rules |
| **Queue** | Celery + Redis | Anomaly detection, alert evaluation, AI tasks |
| **Real-time** | Socket.IO (ASGI) | Live dashboard, alert push, P1 banner |
| **Metrics store** | VictoriaMetrics | Prometheus-compatible, single binary, handles millions of time series |
| **Trace store** | Tempo (Grafana) | OTel-native, single binary, stores to local disk |
| **Log store** | Loki (Grafana) | OTel log exporter compatible, low-cost indexing |
| **ITSM DB** | PostgreSQL 16 | Incidents, changes, problems, entities, alert rules |
| **OTel ingestion** | OpenTelemetry Collector | Universal gateway: receives OTLP, routes metrics/traces/logs |
| **AI** | Groq API (Llama 3.1 8B/70B) + LangChain | Free tier, 30 req/min, no GPU needed |
| **Embeddings** | sentence-transformers + pgvector (Supabase) | Runbook RAG + log semantic search, replaces ChromaDB |
| **Infra** | Vercel (frontend) + Railway (backend/celery) + Fly.io (workers) | Zero-cost hosted, always-on free tier |

---

## Platform Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MONITORED TARGETS                         │
│  K8s pods │ Cloud VMs │ Microservices │ Databases │ APIs     │
└───────────────────────┬─────────────────────────────────────┘
                        │  OTel SDK + OTel Collector
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              NORTHSTAR INGESTION LAYER                       │
│  OTel Collector → routes OTLP:                               │
│    metrics  → VictoriaMetrics (remote_write)                 │
│    traces   → Tempo (OTLP)                                   │
│    logs     → Loki (Loki exporter)                           │
│    events   → NorthStar Backend API (alerts webhook)         │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌─────────────────────────────────────────────────────────────┐
│              NORTHSTAR BACKEND (FastAPI)                     │
│                                                              │
│  ┌─────────────────┐  ┌──────────────────┐                  │
│  │  Entity Engine  │  │  Topology Engine  │                  │
│  │ (auto-CMDB from │  │ (dependency graph │                  │
│  │  OTel attrs)    │  │  from trace spans)│                  │
│  └─────────────────┘  └──────────────────┘                  │
│                                                              │
│  ┌─────────────────┐  ┌──────────────────┐                  │
│  │ Anomaly Engine  │  │  Alert Rules      │                  │
│  │ (ISOLATE + LogGPT│  │  Engine           │                  │
│  │  — paper-backed) │  │  (threshold +ML)  │                  │
│  └─────────────────┘  └──────────────────┘                  │
│                                                              │
│  ┌─────────────────────────────────────────┐                │
│  │         AI Ops Engine (Ollama)           │                │
│  │  • RCA: MULAN fusion + RUN Granger       │                │
│  │  • Correlation: Contrastive embeddings   │                │
│  │  • Change risk: LightGBM + SHAP          │                │
│  │  • SLA predict: TFT latency forecast     │                │
│  │  • Copilot: Llama 3.1 + full context     │                │
│  └─────────────────────────────────────────┘                │
│                                                              │
│  ┌──────────────────────────────────────────┐               │
│  │           ITSM Services                   │               │
│  │  Incidents │ Changes │ Problems │ SLA      │               │
│  └──────────────────────────────────────────┘               │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌─────────────────────────────────────────────────────────────┐
│                  NORTHSTAR FRONTEND                          │
│                                                              │
│  • Ops Center Dashboard (real-time KPIs + live alerts)       │
│  • Service Topology Map (Smartscape equivalent)              │
│  • Metrics Explorer (per entity, custom queries)             │
│  • Trace Viewer (waterfall, span details)                    │
│  • Log Explorer (search, filter, correlate to traces)        │
│  • Kubernetes Overview (pods/nodes/namespaces)               │
│  • ITSM: Incidents │ Changes │ Problems │ CMDB               │
│  • AI Copilot (context-aware ops assistant)                  │
│  • Service Catalog + SLA Dashboard                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Hosting Architecture (Free Tier — No Docker)

### NorthStar Platform Services

| Service | Provider | Plan | Purpose |
|---|---|---|---|
| **PostgreSQL** | **Neon** | Free (0.5 GB) | ITSM data, entities, alert rules, CMDB, pgvector embeddings |
| **Redis** | **Upstash** | Free (10K cmd/day, 256 MB) | Celery broker, pub/sub, metric cache |
| **FastAPI backend** | **Railway** | Starter ($5 credit/mo) | ITSM API + AI ops engine, always-on |
| **Celery workers** | **Railway** | Same project, second service | Anomaly detection, alert eval, AI tasks |
| **Next.js frontend** | **Vercel** | Hobby (free) | SSR frontend, CDN-distributed |
| **Metrics store** | **Grafana Cloud** | Free (10K series) | Prometheus-compatible remote_write endpoint |
| **Trace store** | **Grafana Cloud** | Free (50 GB/mo) | Tempo OTLP ingest |
| **Log store** | **Grafana Cloud** | Free (50 GB/mo) | Loki OTLP ingest |
| **OTel ingestion** | **Grafana Cloud OTLP endpoint** | Included | Replaces self-hosted OTel Collector — single endpoint for metrics/traces/logs |
| **LLM** | **Groq API** | Free (30 req/min, Llama 3.1 70B) | AI Ops Copilot, RCA summaries, NL queries |
| **Vector search** | **pgvector on Neon** | Included | Replaces ChromaDB — KB RAG, log semantic search |

### OTel Data Generator (What Feeds NorthStar)

| Service | Provider | Plan | Purpose |
|---|---|---|---|
| `otel-data-generator` | **Railway** | Free service | Single Python process that emits realistic OTLP metrics, traces, and logs directly to Grafana Cloud, simulating 5 e-commerce microservices |

### URL Routing

| Route | Destination |
|---|---|
| `northstar.vercel.app` | Next.js frontend |
| `api.northstar.up.railway.app` | FastAPI backend |
| Grafana Cloud endpoints | Metrics, traces, logs (from generator + NorthStar backend) |

---

## Database Schema (PostgreSQL — ITSM + Entities)

**ITSM tables:** `users`, `sla_policies`, `incidents`, `changes`, `problems`, `activity_logs`, `freeze_windows`, `kb_articles`, `digests`

**Observability tables (metadata, not time-series):**

```sql
-- ENTITIES (auto-discovered CMDB)
CREATE TABLE entities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     VARCHAR(50) NOT NULL,  -- 'service' | 'host' | 'pod' | 'container' | 'database'
    name            VARCHAR(255) NOT NULL,
    namespace       VARCHAR(255),          -- K8s namespace
    cluster         VARCHAR(255),          -- K8s cluster name
    cloud_provider  VARCHAR(50),           -- 'aws' | 'azure' | 'gcp'
    cloud_region    VARCHAR(100),
    labels          JSONB DEFAULT '{}',    -- OTel resource attributes
    health_status   VARCHAR(50) DEFAULT 'unknown',
    last_seen_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- SERVICE TOPOLOGY EDGES (derived from trace spans)
CREATE TABLE topology_edges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_entity   UUID REFERENCES entities(id),
    target_entity   UUID REFERENCES entities(id),
    edge_type       VARCHAR(50),           -- 'calls' | 'depends_on' | 'runs_on'
    call_count      BIGINT DEFAULT 0,
    error_rate      FLOAT,
    avg_latency_ms  FLOAT,
    last_seen_at    TIMESTAMPTZ,
    UNIQUE (source_entity, target_entity)
);

-- ALERT RULES
CREATE TABLE alert_rules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    entity_type     VARCHAR(50),
    metric_name     VARCHAR(255),
    condition       VARCHAR(50),           -- 'gt' | 'lt' | 'anomaly'
    threshold       FLOAT,
    window_minutes  INTEGER DEFAULT 5,
    severity        VARCHAR(50) NOT NULL,
    auto_create_incident BOOLEAN DEFAULT false,
    auto_incident_priority VARCHAR(10),
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ALERTS (fired instances)
CREATE TABLE alerts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id         UUID REFERENCES alert_rules(id),
    entity_id       UUID REFERENCES entities(id),
    source          VARCHAR(100) NOT NULL,  -- 'rule' | 'otel' | 'webhook' | 'anomaly_engine'
    severity        VARCHAR(50) NOT NULL,
    title           VARCHAR(500),
    fingerprint     VARCHAR(255),
    status          VARCHAR(50) DEFAULT 'firing',
    incident_id     UUID,
    raw_payload     JSONB,
    received_at     TIMESTAMPTZ DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ
);

-- SYNTHETIC CHECKS
CREATE TABLE synthetic_checks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    url             TEXT NOT NULL,
    method          VARCHAR(10) DEFAULT 'GET',
    interval_seconds INTEGER DEFAULT 60,
    timeout_ms      INTEGER DEFAULT 5000,
    expected_status INTEGER DEFAULT 200,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE synthetic_results (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_id    UUID REFERENCES synthetic_checks(id),
    status      VARCHAR(50),
    response_ms INTEGER,
    http_status INTEGER,
    error       TEXT,
    checked_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## OTel Data Generator — Demo Data Source

A single Python process deployed to Railway that emits realistic OTLP metrics, traces, and logs to Grafana Cloud as if five e-commerce microservices were running. No real application. No extra services. Grafana Cloud, NorthStar's topology engine, and all AI components receive identical data to what a real app would produce.

### Simulated Service Topology

```
api-gateway
    │
    ├──→ order-service
    │         ├──→ payment-service  (DB pool sim — main failure point)
    │         ├──→ inventory-service
    │         └──→ notification-service
    │
    └──→ inventory-service  (product browse path)
```

5 nodes, 7 edges. NorthStar's topology builder derives this graph from the `parent_span_id` relationships in the generated traces — exactly the same as it would from a real app.

### How It Works

The generator runs a tight loop (~8 req/s baseline) and for each simulated request:

1. Creates a root span for `api-gateway` with a real `trace_id`
2. Creates child spans for each downstream service call, linked via `parent_span_id`
3. Sets realistic durations (sampled from per-service latency distributions)
4. Injects errors according to the current chaos mode
5. Emits a structured log line per span (with `trace_id` + `span_id` for correlation)
6. Emits metric observations (counters, histograms, gauges) via OTel Metrics SDK
7. Exports everything via OTLP HTTP to Grafana Cloud

The result: real distributed traces with multi-hop waterfalls, correlated logs, and live metric charts — indistinguishable from a real instrumented app.

### Traffic Patterns

```python
BASELINE = {
    "browse_products":   {"rps": 0.7, "path": ["api-gateway", "inventory-service"]},
    "view_order":        {"rps": 0.25, "path": ["api-gateway", "order-service"]},
    "checkout":          {"rps": 0.13, "path": ["api-gateway", "order-service",
                                                 "payment-service", "inventory-service",
                                                 "notification-service"]},
}

# Diurnal multiplier: 1.0 baseline, 2.5× at top of hour, 1.8× at half hour
# Produces realistic-looking trend graphs over time
```

### Chaos Modes

Triggered by calling `POST /generator/chaos/{mode}` on the Railway service (exposed via the NorthStar backend as a demo control endpoint):

| Mode | What changes | Expected NorthStar response |
|---|---|---|
| `payment_degradation` | payment-service spans: error rate → 70%, p99 latency → 4s | Alert fires → P1 auto-created → AI RCA: "payment-service connection pool exhausted" |
| `inventory_storm` | inventory-service spans: all latency → 800ms+ | Latency SLA breach alert; affected services turn amber on topology map |
| `notification_crash` | notification-service spans: stop emitting for 3 min, then resume with restart marker | Synthetic check fails; uptime dips; incident auto-created |
| `cascade_failure` | payment_degradation + inventory_storm simultaneously | Multi-service P1; topology map goes red; Problem auto-created by correlation engine |
| `stop` | All modes off; return to baseline | Incidents auto-resolve; recovery event on timeline |

### Backfill Mode

Run once on first deploy to populate 7 days of history in seconds:

```bash
python generator.py --backfill --days 7
```

Uses Grafana Cloud's Prometheus remote_write API (for metrics) and OTLP HTTP (for traces/logs) with backdated timestamps. After backfill, NorthStar's trend charts, anomaly models, and digest engine all have a week of data to work with before the demo starts.

### Metrics Emitted

| Metric | Type | Simulated service |
|---|---|---|
| `orders.created_total` | Counter | order-service |
| `orders.processing_duration_seconds` | Histogram (p50/p95/p99) | order-service |
| `orders.failed_total` | Counter | order-service |
| `payment.success_rate` | Gauge | payment-service |
| `payment.processing_duration_ms` | Histogram | payment-service |
| `payment.connection_pool_saturation` | Gauge (0–1) | payment-service |
| `inventory.stock_level` | Gauge (per SKU) | inventory-service |
| `inventory.query_latency_ms` | Histogram | inventory-service |
| `notifications.queue_depth` | Gauge | notification-service |
| `http.server.duration` | Histogram | all services |
| `http.server.active_requests` | UpDownCounter | all services |

### Structured Logs Emitted

Every span also emits a JSON log line to Grafana Loki:

```json
{
  "timestamp": "2026-09-16T14:23:01.412Z",
  "service": "payment-service",
  "level": "ERROR",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "message": "DB connection pool exhausted after 3000ms wait",
  "error.type": "connection_pool_exhausted",
  "payment.amount": 142.50,
  "payment.method": "card"
}
```

Log Explorer → click `trace_id` → trace waterfall opens. This correlation is what impresses in the demo.

### Generator Structure (lives inside NorthStar repo)

```
northstar/
└── data-generator/
    ├── generator.py        # main loop: traffic simulation + OTLP export
    ├── services.py         # per-service latency distributions + error profiles
    ├── chaos.py            # chaos mode state machine
    ├── backfill.py         # historical data injection (remote_write + OTLP)
    ├── api.py              # FastAPI app exposing /generator/chaos/{mode} endpoint
    └── requirements.txt
```

Single Railway service. The FastAPI `api.py` is just a control plane — it shares a process with the generator loop via a background thread.

---

## Key API Endpoints

```
# Auth
POST /auth/login

# ITSM
GET/POST      /incidents
GET/PUT       /incidents/{id}
GET           /incidents/{id}/timeline
POST          /incidents/{id}/escalate
GET           /incidents/stats/trend
GET           /incidents/stats/sla
GET/POST      /changes
POST          /changes/{id}/approve
GET/POST      /problems
GET           /knowledge-base

# Observability
GET  /entities                          → CMDB list with health status
GET  /entities/{id}                     → Entity detail + linked metrics/traces/incidents
GET  /entities/{id}/metrics             → proxies VictoriaMetrics query for this entity
GET  /entities/{id}/traces              → proxies Tempo trace search for this entity
GET  /topology                          → full topology graph (nodes + edges + health)
GET  /topology/{entity_id}/neighbors    → adjacent services + call stats

# Metrics (proxy to VictoriaMetrics)
GET  /metrics/query                     → instant query (PromQL)
GET  /metrics/query_range               → range query for charts
GET  /metrics/labels                    → label names for autocomplete

# Traces (proxy to Tempo)
GET  /traces/search                     → search traces by service, duration, status
GET  /traces/{trace_id}                 → full trace waterfall (spans)

# Logs (proxy to Loki)
GET  /logs/query                        → LogQL query
GET  /logs/labels

# Alerts
GET/POST  /alerts
GET/POST  /alert-rules
POST      /alerts/webhook               → inbound OTel + Prometheus AlertManager

# Synthetic
GET/POST  /synthetic/checks
GET       /synthetic/checks/{id}/results

# AI Ops
POST /ai/rca               → {incident_id} → AI root cause analysis using correlated signals
POST /ai/copilot           → SSE streaming context-aware ops copilot
POST /ai/chat              → SSE streaming runbook chatbot
POST /ai/nl-query          → NL text → PromQL/LogQL/Tempo query + results
POST /ai/risk-score        → RFC blast radius + LightGBM risk score + SHAP explanation
GET  /ai/anomaly-report
GET  /ai/digest            → ops intelligence digest

# Dashboard
GET  /dashboard/metrics    → live KPI snapshot (Redis-cached 30s)
GET  /dashboard/trend      → 24h/7d incident trend
```

**Socket.IO events (namespace `/dashboard`):**
`metrics_update`, `incident_created`, `incident_updated`, `p1_alert`, `sla_breach`, `alert_received`, `entity_health_changed`, `topology_updated`, `rca_ready`

---

## Implementation — Vertical Slices

Each slice delivers a complete, demo-able end-to-end feature (schema + API + UI together).

---

### Slice 0 — Scaffold
*All services deployed; shell renders; OTel pipeline works end-to-end.*

- **Neon**: provision PostgreSQL DB, note connection string
- **Upstash**: provision Redis, note `UPSTASH_REDIS_URL`
- **Grafana Cloud**: provision stack → copy OTLP endpoint + API key
- **Groq**: provision API key (free, instant)
- **Railway**: create project → deploy FastAPI backend + Celery worker as two services; inject all env vars
- FastAPI `main.py`: app factory, CORS, `GET /health`
- SQLAlchemy async engine + Alembic scaffold (runs migrations on Railway deploy)
- **Vercel**: connect frontend repo → auto-deploy Next.js 14
- Next.js init: shadcn/ui, Tailwind dark theme, sidebar layout (stubs for: Dashboard, Services, Traces, Logs, Incidents, Changes, CMDB, AI Copilot)
- **Data Generator**: deploy `data-generator/` to Railway as a second service; run `python generator.py --backfill --days 7` once; confirm traces appear in Grafana Cloud Tempo and metrics in Grafana Cloud Prometheus
- `.env.example` + README quickstart (provision accounts → set env vars → push to Railway/Vercel)

**Done when:** Vercel URL shows the nav shell; Grafana Cloud shows 7 days of metric history; `GET /health` on Railway backend returns 200; topology map renders 5 nodes.

---

### Slice 1 — Entity Discovery + CMDB
*OTel resource attributes → auto-populated CMDB; entity health status.*

**Backend:**
- `EntityDiscoveryWorker` (Celery every 30s): queries VictoriaMetrics for unique `{service_name, k8s_namespace, k8s_pod_name}` label sets → upserts into `entities`
- `EntityHealthEvaluator`: sets `health_status` per entity from error rate + latency queries

**Frontend:**
- `/cmdb` — entity list: icon by type, health badge (green/amber/red dot), labels
- Entity detail page: metadata, OTel resource attributes, health timeline

**Done when:** instrument sample app with OTel SDK → entity appears in CMDB with health status.

---

### Slice 2 — Metrics Explorer + Per-Entity Dashboards
*PromQL proxy → metric charts → golden signals per entity.*

**Backend:** `GET /metrics/query_range` proxies to VictoriaMetrics; `GET /entities/{id}/metrics` returns pre-built golden signal queries by entity type.

**Frontend:**
- `/metrics` — Metrics Explorer: PromQL input, Recharts line chart, time range picker
- Entity detail → "Metrics" tab: auto-rendered golden signals (no PromQL needed)
- `ServiceHealthCard` on dashboard: sparkline + error rate for top 5 services

**Done when:** entity metrics tab shows CPU/latency/error rate charts live.

---

### Slice 3 — Service Topology Map (Smartscape)
*Trace spans → dependency graph → interactive D3 force-directed map.*

**Backend:**
- `TopologyBuilder` (Celery every 60s): queries Tempo spans → extracts service call edges → upserts `topology_edges`
- `GET /topology` returns `{nodes, edges}` with health + latency per edge

**Frontend:**
- `/services` — D3 force-directed graph:
  - Nodes colored by health; edges labeled with RPS + latency (red if error rate > threshold)
  - Click node: side panel with entity detail, golden signals, active incidents
  - "Blast radius" mode: highlight downstream services

**Done when:** trace traffic between two services → edge appears on topology map with latency.

---

### Slice 4 — Distributed Trace Viewer
*Trace search → waterfall visualization → span details → link to logs.*

**Backend:** Proxies to Tempo `/api/search` + `/api/traces/{id}`.

**Frontend:**
- `/traces` — search by service, status, duration; results list
- Trace detail: Recharts Gantt waterfall; span attributes; "View Logs" button (links to Log Explorer filtered to `trace_id`)

**Done when:** find a slow request in trace search; waterfall shows the slow span; click to view correlated logs.

---

### Slice 5 — Log Explorer
*Loki LogQL proxy → log search → trace correlation.*

**Backend:** Proxies LogQL to Loki; SSE live tail endpoint.

**Frontend:**
- `/logs` — LogQL input, label autocomplete, results with severity badge; click log line → expand JSON + "View Trace" if `trace_id` present
- Incident detail → "Logs" tab: auto-queries Loki for service + incident time window

**Done when:** filter logs by service → click log with trace_id → trace waterfall opens.

---

### Slice 6 — Kubernetes Overview
*OTel k8s receiver → pods/nodes/namespaces dashboard.*

**Backend:** OTel Collector k8s receivers + `k8sattributes`; pods/nodes handled by CMDB (Slice 1).

**Frontend:**
- `/kubernetes` — namespace selector; node panels (CPU/memory bars); workloads table (replicas); pod list with restart badge (red if > 3); OOMKilled/CrashLoopBackOff pods highlighted with "Create Incident" button

**Done when:** crashing pod appears with red restart badge; "Create Incident" → P2 linked to pod entity.

---

### Slice 7 — Alert Rules Engine + Auto-Incident Creation
*Alert rules → Celery evaluation → auto-incident → ITSM.*

**Backend:**
- `AlertEvaluator` (Celery beat every 30s): evaluates active rules against VictoriaMetrics; dedup via `fingerprint`; auto-creates incident if configured
- `POST /alerts/webhook`: accepts Prometheus AlertManager format

**Frontend:**
- `/alerts` — alert center with entity link, severity, duration, linked incident
- `AlertFeed` ticker on dashboard; Alert Rules UI (PromQL expression + auto-incident toggle)
- `P1AlertBanner`: full-screen red flash + audio on `p1_alert` socket event

**Scripts:** `scripts/trigger_chaos.py` — calls `POST /generator/chaos/payment_degradation` on the data generator → metrics spike in Grafana Cloud → alert evaluator picks it up → P1 auto-creates.

**Done when:** alert rule "error_rate > 5% → P1"; run simulate script; P1 banner fires.

---

### Slice 8 — ITSM Core (Incident + Change + SLA)
*Full Xurrent-equivalent ITSM workflows.*

**Backend:** Incidents + changes CRUD; SLA engine (`sla_breach_at` computed on creation; Celery sweep); activity log; RFC approval workflow (role-gated).

**Frontend:**
- `/incidents` — list with SLA countdown badges; entity link; trace/log quick-links
- Incident detail: `ActivityTimeline`, "View Traces", "View Logs", "Related Entities" tabs
- `/changes` — `RfcForm` multi-step wizard; `ApprovalFlow` stepper (Submitter → CAB → Implementer)
- `SlaCountdownBadge`: amber at 30 min, pulse-red at 15 min

**Done when:** SLA countdown ticks live; incident from K8s entity has full entity context in timeline.

---

### Slice 9 — AI Ops Engine (Research-Grounded Davis AI Equivalent)
*Every component backed by peer-reviewed arXiv papers. Four-layer pipeline.*

```
Metrics + Traces + Logs stream
        ↓
[Layer 1] Anomaly Detection (runs continuously, unsupervised)
        ↓ fires only on anomaly
[Layer 2] Multimodal Signal Fusion (correlates all three signals)
        ↓
[Layer 3] Causal Graph RCA (pinpoints root cause)
        ↓
[Layer 4] ITSM Output (writes RCA to incident; routes to team)
```

#### 9a — Anomaly Detection Engine
**Paper:** ISOLATE (arXiv 2307.10869, github.com/WenweiGu/ISOLATE) for metrics — PU learning, GNN + GRU, trains on normal-only data. LogGPT (arXiv 2309.14482, github.com/nokia/LogGPT) for logs — GPT self-supervised on normal sequences, RL fine-tuned.

- `MetricAnomalyDetector`: 10-min sliding windows from VictoriaMetrics → ISOLATE → anomaly score per entity
- `LogAnomalyDetector`: Loki stream → Drain3 template extraction → LogGPT → anomaly events
- Anomaly events → Redis pub/sub → triggers Layer 2

Works without large labeled dataset: PU learning needs only confirmed-normal data (days of operation).

#### 9b — Multimodal RCA (Core AI Engine)
**Papers:** MULAN (arXiv 2402.02357) for multimodal fusion; RUN (arXiv 2402.01140, github.com/zmlin1998/RUN) for causal graph ranking.

`RcaEngine` (Celery task on anomaly trigger):
1. Query VictoriaMetrics: 30-min metric window for anomalous entity + topology neighbors
2. Query Tempo: failing trace spans in time window
3. Query Loki: error logs in time window
4. **MULAN-inspired fusion:** log anomaly scores + trace span error rates + metric z-scores → contrastive fusion layer → anomalous service ranking (KPI-aware attention weights which modality to trust)
5. **RUN Granger causality:** neural Granger model on metric window → causal lead-lag relationships → PersonalizedPageRank → top-3 root cause services
6. Ensemble: if both agree → high confidence; if disagree → both listed with evidence tags
7. Missing modality fallback: ARMOR approach (arXiv 2603.25538) — gated fusion with placeholder tokens
8. Write `{root_cause_service, confidence, causal_chain[], evidence[]}` to `incidents.ai_rca`; emit `rca_ready`

Benchmark: RCAEval (arXiv 2412.17015, github.com/phamquiluan/RCAEval) — 15 baselines, 735 failure cases. Use as monthly CI validation harness.

**Frontend:**
- Incident detail → "AI RCA" tab: `CausalChainViz` animated graph (A→B→C, root cause highlighted); evidence cards (metric chart, trace link, log excerpt); confidence meter + modality weights
- Timeline event: "AI RCA generated — 91% confidence: payments-db connection pool exhausted"

#### 9c — Incident Correlation + Auto-Problem Creation
**Papers:** Contrastive embedding clustering (arXiv 2509.24446); KGroot knowledge graph (arXiv 2402.13264).

`CorrelationEngine` (Celery every 5 min):
1. `sentence-transformers` encodes incident titles → vector space
2. Cosine similarity clustering within 30-min window (threshold > 0.80)
3. Topology bonus: incidents on directly-connected entities score higher
4. KGroot-inspired fingerprint lookup against historical problem patterns
5. Cluster ≥ 3 + confidence > 0.80 → auto-create `problems` with AI-generated title

**Frontend:** Dashboard `ProblemBanner`; `/problems` list; topology subgraph on problem detail.

#### 9d — Change Risk Scoring
**Paper:** LightGBM + SHAP on ITSM change records (arXiv 2604.13462). Works with weeks of data, fully explainable, regulatory-safe.

Features: change type, affected service count, has_rollback_plan, team's historical failure rate, overlap with active incidents/freeze windows, time of day.

`ChangeRiskScorer`: trains offline monthly on `changes + incidents` history. Inference synchronous on RFC submission.

**Frontend:** `RiskScoreBadge` (green/amber/red); SHAP waterfall chart in RFC detail ("Why this score?"); low-risk auto-flags for fast-track.

#### 9e — Predictive SLA Breach
**Paper:** TFT latency forecasting (arXiv 2409.03103) + behavioral heuristics.

- Fast heuristic (every 10 min): time since last update + assignee changes + team load → `breach_probability`
- TFT predictor (hourly on P1/P2): forecasts service latency from Prometheus history; warns if forecast breaches SLA with > 60 min remaining

**Frontend:** ⚡ amber badge on incident rows; "At Risk" panel on dashboard; TFT forecast chart on P1 detail.

#### 9f — Kubernetes Failure Prediction
**Paper:** Graph-based K8s normality detection (arXiv 2503.14114).

`K8sAnomalyDetector` (Celery every 2 min): cluster graph (pods/nodes/edges = scheduling affinity + network adjacency) → graph normality model → anomaly scores. Detects cascading failures invisible to per-pod thresholds.

**Frontend:** Anomalous pods highlighted in K8s overview with score; "Predicted failure" badge if > 0.85.

#### 9g — AI Ops Copilot
Llama 3.1 via Ollama, SSE streaming, full platform context injected per request: active P1/P2 + RCA summaries, alert feed, topology health, K8s anomalies, upcoming RFCs.

Sample queries: *"What's most urgent?"* / *"Is it safe to deploy now?"* / *"Write a status update for the P1"* / *"Why is checkout slow?"*

**Frontend:** Persistent right-side drawer (Cmd+Shift+A); "Briefing" → 3-bullet summary in <3s.

#### 9h — NL Observability Search
`POST /ai/nl-query` — LangChain chain with few-shot examples converts NL to PromQL/LogQL/Tempo params → executes → returns results + generated query.

**Frontend:** Cmd+K universal search bar; NL input → generated query shown + results.

#### 9i — Auto-Generated KB Articles
On incident close: LangChain reads full timeline + RCA → generates Title, Symptoms, Root Cause, Resolution Steps, Prevention → stores in `kb_articles`; indexed in ChromaDB for RAG chatbot.

**Frontend:** `/knowledge-base` — full-text search; chatbot uses KB in RAG.

---

### Slice 10 — Synthetic Monitoring
HTTP probes on schedule → uptime tracking → auto-incident on 3 consecutive failures.

**Frontend:** `/synthetic` — uptime % badge, response sparkline, status timeline (green/red bars).

---

### Slice 11 — Ops Intelligence Digest
Celery beat every 8h: LangChain summarizes P1/P2 counts, SLA %, top incident types, anomalies, changes, top concern → `digests` table.

**Frontend:** Dashboard `DigestPanel`; "AI Top Concern" chip at top; HTML export.

---

### Slice 12 — Polish + Demo Hardening

- **Visual theme:** deep navy (#0A0F1E) bg, electric blue (#3B82F6) accents, amber/red alert colors
- **Framer Motion:** animated KPI counters, badge pulse on escalation, service map node animations
- **Skeleton loaders** + **sonner** toasts for all socket events
- **Command palette** (Cmd+K): NL search → metrics/logs/traces/incidents
- **Full seed:** `seed_demo.py` — 200 historical incidents, 20 changes, 3 active P1s, 15 entities, 8 topology edges, 5 KB articles
- **Demo scenario script:** `scripts/simulate_demo.py` (calls the data generator's chaos API):
  1. `POST /generator/chaos/payment_degradation` → generator starts emitting 70% error spans for payment-service
  2. Alert fires → P1 auto-created → P1 banner flashes + audio
  3. AI RCA runs → "Root cause: payment-service connection pool exhausted (91% confidence)" in ~15s
  4. `order-service` incidents cluster → Problem auto-created with AI-generated title
  5. Topology map: payment-service node turns red; downstream edges highlighted
  6. `POST /generator/chaos/cascade_failure` (optional escalation) → inventory also degrades
  7. Copilot briefing: "2 active P1s, checkout and payments degraded — 47 orders failed in last 10 minutes"
  8. `POST /generator/chaos/stop` → generator returns to baseline; incident resolves; KB article auto-generated
- Railway: backend + generator both healthy; Grafana Cloud receiving continuous OTLP from generator

---

## Research Foundation (arXiv Papers)

Every AI component is grounded in peer-reviewed research (2021–2026).

| Feature | Paper | arXiv ID | Year | Open Source? |
|---|---|---|---|---|
| Metric anomaly detection | ISOLATE (PU learning, GNN+GRU) | 2307.10869 | 2023 | Yes — github.com/WenweiGu/ISOLATE |
| Log anomaly detection | LogGPT (GPT + RL, Nokia) | 2309.14482 | 2023 | Yes — github.com/nokia/LogGPT |
| Multimodal fusion RCA | MULAN (contrastive fusion + KPI attention) | 2402.02357 | 2024 | No (implement from paper) |
| Causal graph RCA | RUN (Neural Granger + PageRank) | 2402.01140 | 2024 | Yes — github.com/zmlin1998/RUN |
| Missing-modality fallback | ARMOR (gated fusion + placeholders) | 2603.25538 | 2026 | No (implement from paper) |
| RCA benchmark harness | RCAEval (15 baselines, 735 failures) | 2412.17015 | 2024 | Yes — github.com/phamquiluan/RCAEval |
| Incident correlation | Contrastive embedding clustering | 2509.24446 | 2025 | No (sentence-transformers backbone) |
| Knowledge graph correlation | KGroot (GCN on fault knowledge graphs) | 2402.13264 | 2024 | No (implement from paper) |
| Change risk scoring | LightGBM + SHAP on ITSM records | 2604.13462 | 2026 | Yes (LightGBM + SHAP open source) |
| SLA breach prediction | TFT latency forecasting | 2409.03103 | 2024 | Yes (PyTorch Forecasting) |
| K8s failure prediction | Graph-based K8s normality | 2503.14114 | 2025 | No (implement from paper) |
| Cloud anomaly baseline | IBM Cloud autoencoder study | 2411.09047 | 2024 | Yes (Zenodo dataset + scripts) |
| AIOps pipeline blueprint | AIOps Incident Management Survey | 2404.01363 | 2024 | N/A (survey) |

---

## What Makes NorthStar Better Than "Dynatrace + Xurrent"

| Feature | Dynatrace | Xurrent | NorthStar |
|---|---|---|---|
| Full-stack observability | ✅ | ❌ | ✅ |
| ITSM workflows | ❌ | ✅ | ✅ |
| Unified single pane | ❌ (separate tools) | ❌ | ✅ |
| OTel native | Partial | ❌ | ✅ (only) |
| AI RCA | ✅ Davis AI | ❌ | ✅ Research-grounded open-source AI |
| Data leaves your org | ✅ (SaaS) | ✅ (SaaS) | Observability data → Grafana Cloud; ITSM data stays in your Neon DB |
| Trace → Log → Incident correlation | ✅ | ❌ | ✅ |
| Explainable AI (SHAP) | ❌ | ❌ | ✅ |
| Cost | $$$$ per host/agent | $$$$ per agent | Free (open-source free-tier stack) |
| Zero-infra deploy | ❌ | ❌ | ✅ (push to Railway/Vercel) |
| Vendor lock-in | High | High | Zero (swap any component) |

**The pitch:** *"NorthStar is the ops platform that replaces two six-figure SaaS contracts with open-source components on free-tier hosting. No agents. No proprietary data formats. The AI is grounded in published peer-reviewed research — not a black box. And your engineers switch between traces, logs, and incident workflows without leaving the screen."*

---

## Verification (End-to-End Test Plan)

### Pre-Demo Setup (one-time, ~30 min)
1. Provision accounts: Neon, Upstash, Grafana Cloud, Groq, Railway, Vercel (all free)
2. Push NorthStar backend → Railway auto-deploys; Alembic migrations run on startup
3. Push `data-generator/` → Railway deploys as second service; starts emitting live OTLP immediately
4. Run `python generator.py --backfill --days 7` once → 7 days of metric/trace history injected in ~2 min
5. Push NorthStar frontend → Vercel deploys at `northstar.vercel.app`
6. Run `python scripts/seed_demo.py` → CMDB entities, historical incidents, changes, KB articles populated

### Demo Walkthrough
7. Open `northstar.vercel.app` → login → dashboard shows live KPIs from the generator (orders/min, payment success rate, p99 latency with 7-day trend)
8. Topology map → 5 nodes, 7 edges, all green; click `payment-service` → side panel shows golden signals
9. Trace Explorer → find a checkout trace (4 spans: api-gateway → order-service → payment-service → inventory-service); waterfall renders; click span → logs filtered to that `trace_id`
10. **Trigger chaos:** `POST /generator/chaos/payment_degradation` (via `simulate_demo.py` or the NorthStar demo control UI) → generator starts emitting error spans
11. Within 30s: alert fires → P1 auto-created → P1 banner flashes red on dashboard
12. Within 15s of P1: AI RCA tab shows "Root cause: payment-service connection pool exhausted (91% confidence)" + causal chain graph
13. Copilot: *"What's the most urgent issue?"* → contextual briefing with P1 details + RCA summary
14. Copilot: *"Is it safe to deploy a DB migration to payment-service?"* → detects active P1 → declines + explains blast radius
15. Submit RFC with no rollback plan → LightGBM risk score 70+; SHAP waterfall shows top factors
16. Log Explorer: `service=payment-service AND level=error` → click log with `trace_id` → trace waterfall opens
17. **Stop chaos:** `POST /generator/chaos/stop` → baseline resumes; incident auto-resolves; AI KB article generated
18. Synthetic check timeline shows the degradation window in red — clean visual of the incident lifecycle
