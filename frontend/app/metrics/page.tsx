"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { metricsApi } from "@/lib/api";
import { getRangeParams, type TimeRange } from "@/lib/time";
import { MetricChart } from "@/components/charts/metric-chart";
import { TimeRangePicker } from "@/components/charts/time-range-picker";
import { Play, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const EXAMPLE_QUERIES = [
  { label: "HTTP Request Rate",   promql: 'sum by (service_name) (rate(http_server_duration_milliseconds_count[5m]))' },
  { label: "Error Rate %",        promql: '100 * sum by (service_name) (rate(http_server_duration_milliseconds_count{http_status_code=~"5.."}[5m])) / sum by (service_name) (rate(http_server_duration_milliseconds_count[5m]))' },
  { label: "p99 Latency (ms)",    promql: 'histogram_quantile(0.99, sum by (service_name, le) (rate(http_server_duration_milliseconds_bucket[5m])))' },
  { label: "Payment Success Rate", promql: 'payment_success_rate' },
  { label: "Active Requests",     promql: 'sum by (service_name) (http_server_active_requests)' },
];

export default function MetricsPage() {
  const [input, setInput]       = useState(EXAMPLE_QUERIES[0].promql);
  const [query, setQuery]       = useState(EXAMPLE_QUERIES[0].promql);
  const [range, setRange]       = useState<TimeRange>("1h");

  const { start, end, step } = getRangeParams(range);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["metrics-explorer", query, range],
    queryFn: () => metricsApi.queryRange(query, start, end, step),
    enabled: !!query,
    retry: false,
  });

  const run = useCallback(() => setQuery(input.trim()), [input]);

  const series = data?.data?.result ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-medium">Metrics Explorer</h2>
        <TimeRangePicker value={range} onChange={setRange} />
      </div>

      {/* Query input */}
      <div className="rounded border border-border bg-card overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
          <span className="text-micro text-muted-foreground">PromQL</span>
          <div className="flex gap-1 ml-auto">
            {EXAMPLE_QUERIES.map((ex) => (
              <button
                key={ex.label}
                onClick={() => { setInput(ex.promql); setQuery(ex.promql); }}
                className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 p-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(); }}
            className="flex-1 bg-transparent font-mono text-[12px] text-foreground placeholder:text-muted-foreground outline-none resize-none h-12 leading-6"
            placeholder="Enter PromQL expression…"
            spellCheck={false}
          />
          <Button
            size="sm"
            onClick={run}
            disabled={isLoading || isFetching}
            className="h-8 px-3 gap-1.5 shrink-0"
          >
            <Play size={11} />
            Run
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
          <AlertCircle size={13} />
          {(error as Error).message}
        </div>
      )}

      {/* Chart */}
      {(isLoading || isFetching) && (
        <div className="rounded border border-border bg-card p-4">
          <div className="animate-pulse h-48 rounded bg-muted/30" />
        </div>
      )}

      {data && !isFetching && series.length === 0 && (
        <div className="rounded border border-border bg-card p-6 text-center text-[12px] text-muted-foreground">
          No data returned for this query and time range.
        </div>
      )}

      {data && !isFetching && series.length > 0 && (
        <div className="space-y-3">
          {series.map((s, i) => {
            const seriesLabel = Object.entries(s.metric)
              .filter(([k]) => k !== "__name__")
              .map(([k, v]) => `${k}="${v}"`)
              .join(", ") || "value";

            const colors = ["#22D3EE", "#22C55E", "#F59E0B", "#EF4444", "#A78BFA"];
            const color = colors[i % colors.length];

            return (
              <div key={i} className="rounded border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <span className="font-mono text-[11px] text-muted-foreground truncate">{seriesLabel}</span>
                  <span className="ml-auto tabular-nums text-[11px] text-muted-foreground">
                    {s.values.length} pts
                  </span>
                </div>
                <div className="p-3">
                  <MetricChart
                    data={{ status: "success", data: { resultType: "matrix", result: [s] } }}
                    color={color}
                    height={160}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
