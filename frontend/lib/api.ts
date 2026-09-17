const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// Entity types
export interface Entity {
  id: string;
  entity_type: "service" | "host" | "pod" | "container" | "database";
  name: string;
  namespace: string | null;
  cluster: string | null;
  cloud_provider: string | null;
  cloud_region: string | null;
  labels: Record<string, string | number>;
  health_status: "healthy" | "degraded" | "critical" | "unknown";
  last_seen_at: string | null;
  created_at: string;
}

// Prometheus types
export interface PrometheusRangeResult {
  status: string;
  data: {
    resultType: string;
    result: Array<{
      metric: Record<string, string>;
      values: [number, string][];  // [timestamp, value]
    }>;
  };
}

export interface GoldenSignal {
  id: string;
  label: string;
  unit: string;
  promql: string;
  color: string;
}

export const metricsApi = {
  query: (q: string) =>
    apiFetch<{ status: string; data: { result: Array<{ metric: Record<string, string>; value: [number, string] }> } }>(
      `/metrics/query?q=${encodeURIComponent(q)}`
    ),
  queryRange: (q: string, start: string, end: string, step = "60s") =>
    apiFetch<PrometheusRangeResult>(
      `/metrics/query_range?q=${encodeURIComponent(q)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&step=${step}`
    ),
  labelValues: (label: string) =>
    apiFetch<{ values: string[] }>(`/metrics/label/${label}/values`),
  entityGoldenSignals: (entityId: string) =>
    apiFetch<GoldenSignal[]>(`/metrics/entity/${entityId}/golden-signals`),
  entitySignalData: (entityId: string, signalId: string, start: string, end: string, step = "60s") =>
    apiFetch<{ signal: GoldenSignal; data: PrometheusRangeResult }>(
      `/metrics/entity/${entityId}/golden-signals/${signalId}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&step=${step}`
    ),
};

// Topology types
export interface TopologyNode {
  id: string;
  name: string;
  entity_type: string;
  health_status: "healthy" | "degraded" | "critical" | "unknown";
  error_rate: number | null;
  p99_ms: number | null;
}

export interface TopologyEdge {
  id: string;
  source_id: string;
  target_id: string;
  source: string;
  target: string;
  edge_type: string | null;
  call_count: number;
  error_rate: number | null;
  avg_latency_ms: number | null;
}

export interface TopologyData {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export const topologyApi = {
  get: () => apiFetch<TopologyData>("/topology"),
  seed: () => apiFetch<{ message: string }>("/topology/seed", { method: "POST" }),
};

export const entities = {
  list: (params?: { entity_type?: string; health_status?: string }) => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return apiFetch<Entity[]>(`/entities${qs}`);
  },
  get: (id: string) => apiFetch<Entity>(`/entities/${id}`),
  triggerDiscovery: () =>
    apiFetch<{ message: string }>("/entities/discover", { method: "POST" }),
};
