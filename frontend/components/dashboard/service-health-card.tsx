"use client";

import { useQuery } from "@tanstack/react-query";
import { metricsApi, type Entity } from "@/lib/api";
import { HealthDot } from "@/components/entities/health-dot";
import { SparklineChart } from "@/components/charts/metric-chart";
import { getRangeParams } from "@/lib/time";
import Link from "next/link";

export function ServiceHealthCard({ entity }: { entity: Entity }) {
  const { start, end, step } = getRangeParams("1h");

  const { data: errorData } = useQuery({
    queryKey: ["sparkline-error", entity.name, "1h"],
    queryFn: () =>
      metricsApi.queryRange(
        `100 * sum(rate(http_server_duration_milliseconds_count{service_name="${entity.name}",http_status_code=~"5.."}[5m])) / sum(rate(http_server_duration_milliseconds_count{service_name="${entity.name}"}[5m]))`,
        start, end, step
      ),
    retry: false,
    staleTime: 30_000,
  });

  const { data: latencyData } = useQuery({
    queryKey: ["sparkline-latency", entity.name, "1h"],
    queryFn: () =>
      metricsApi.queryRange(
        `histogram_quantile(0.99, sum by (le)(rate(http_server_duration_milliseconds_bucket{service_name="${entity.name}"}[5m])))`,
        start, end, step
      ),
    retry: false,
    staleTime: 30_000,
  });

  const errorRate = entity.labels["error_rate"];
  const p99 = entity.labels["p99_ms"];

  return (
    <Link
      href={`/cmdb/${entity.id}`}
      className="block rounded border border-border bg-card hover:border-border/80 hover:bg-accent/20 transition-colors overflow-hidden"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-[12px] font-medium truncate">{entity.name}</span>
        <HealthDot status={entity.health_status} />
      </div>

      <div className="px-3 pt-2 pb-1">
        <SparklineChart
          data={latencyData ?? null}
          color={
            entity.health_status === "critical" ? "#EF4444"
            : entity.health_status === "degraded" ? "#F59E0B"
            : "#22D3EE"
          }
          height={36}
        />
      </div>

      <div className="flex items-center justify-between px-3 pb-2.5">
        <div>
          <p className="text-micro text-muted-foreground">Error Rate</p>
          <p className="tabular-nums text-[12px] text-foreground">
            {errorRate != null ? `${(Number(errorRate) * 100).toFixed(1)}%` : "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-micro text-muted-foreground">p99</p>
          <p className="tabular-nums text-[12px] text-foreground">
            {p99 != null ? `${Number(p99).toFixed(0)}ms` : "—"}
          </p>
        </div>
      </div>
    </Link>
  );
}
