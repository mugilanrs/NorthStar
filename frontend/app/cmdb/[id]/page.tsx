"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { entities, metricsApi } from "@/lib/api";
import { HealthDot } from "@/components/entities/health-dot";
import { EntityIcon } from "@/components/entities/entity-icon";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricChart } from "@/components/charts/metric-chart";
import { TimeRangePicker } from "@/components/charts/time-range-picker";
import { getRangeParams, type TimeRange } from "@/lib/time";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Tab = "overview" | "metrics";

export default function EntityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [tab, setTab] = useState<Tab>("overview");
  const [range, setRange] = useState<TimeRange>("1h");

  const { data: entity, isLoading, error } = useQuery({
    queryKey: ["entity", id],
    queryFn: () => entities.get(id),
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/cmdb" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={14} strokeWidth={1.5} />
        </Link>
        <h2 className="text-[16px] font-medium">
          {isLoading ? <Skeleton className="h-4 w-40 inline-block" /> : entity?.name}
        </h2>
        {entity && <HealthDot status={entity.health_status} showLabel size="md" />}
      </div>

      {error && (
        <div className="rounded border border-border bg-card p-4 text-muted-foreground text-[12px]">
          Entity not found or backend unreachable.
        </div>
      )}

      {entity && (
        <>
          {/* Tabs */}
          <div className="flex items-center gap-0 border-b border-border">
            {(["overview", "metrics"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-3 py-2 text-[12px] font-medium capitalize border-b-2 -mb-px transition-colors",
                  tab === t
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "overview" && <OverviewTab entity={entity} />}
          {tab === "metrics" && (
            <MetricsTab entityId={id} range={range} onRangeChange={setRange} />
          )}
        </>
      )}
    </div>
  );
}

function OverviewTab({ entity }: { entity: ReturnType<typeof entities.get> extends Promise<infer T> ? T : never }) {
  return (
    <div className="space-y-3">
      <div className="rounded border border-border bg-card overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-muted/30">
          <span className="text-micro text-muted-foreground">Metadata</span>
        </div>
        <div className="divide-y divide-border/50">
          <MetaRow label="Entity ID" value={<span className="font-mono text-[11px]">{entity.id}</span>} />
          <MetaRow label="Type" value={
            <span className="flex items-center gap-1.5">
              <EntityIcon type={entity.entity_type} size={12} className="text-muted-foreground" />
              <Badge variant="outline" className="text-[11px] h-5 font-normal">{entity.entity_type}</Badge>
            </span>
          } />
          <MetaRow label="Namespace" value={entity.namespace ?? "—"} />
          <MetaRow label="Cluster" value={entity.cluster ?? "—"} />
          <MetaRow label="Cloud Provider" value={entity.cloud_provider ?? "—"} />
          <MetaRow label="Cloud Region" value={entity.cloud_region ?? "—"} />
          <MetaRow label="Created" value={new Date(entity.created_at).toLocaleString()} />
          <MetaRow label="Last Seen" value={entity.last_seen_at ? new Date(entity.last_seen_at).toLocaleString() : "—"} />
        </div>
      </div>

      <div className="rounded border border-border bg-card overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-muted/30">
          <span className="text-micro text-muted-foreground">Health</span>
        </div>
        <div className="divide-y divide-border/50">
          <MetaRow label="Status" value={<HealthDot status={entity.health_status} showLabel size="md" />} />
          {entity.labels["error_rate"] != null && (
            <MetaRow label="Error Rate (5m)" value={
              <span className="tabular-nums">{(Number(entity.labels["error_rate"]) * 100).toFixed(2)}%</span>
            } />
          )}
          {entity.labels["p99_ms"] != null && (
            <MetaRow label="p99 Latency (5m)" value={
              <span className="tabular-nums">{Number(entity.labels["p99_ms"]).toFixed(0)} ms</span>
            } />
          )}
        </div>
      </div>

      {Object.keys(entity.labels).length > 0 && (
        <div className="rounded border border-border bg-card overflow-hidden">
          <div className="px-3 py-2 border-b border-border bg-muted/30">
            <span className="text-micro text-muted-foreground">OTel Resource Attributes</span>
          </div>
          <div className="divide-y divide-border/50">
            {Object.entries(entity.labels).map(([k, v]) => (
              <MetaRow key={k} label={k} value={<span className="font-mono text-[11px]">{String(v)}</span>} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricsTab({
  entityId,
  range,
  onRangeChange,
}: {
  entityId: string;
  range: TimeRange;
  onRangeChange: (r: TimeRange) => void;
}) {
  const { start, end, step } = getRangeParams(range);

  const { data: signals, isLoading: loadingSignals } = useQuery({
    queryKey: ["entity-signals", entityId],
    queryFn: () => metricsApi.entityGoldenSignals(entityId),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-muted-foreground">Golden Signals</span>
        <TimeRangePicker value={range} onChange={onRangeChange} />
      </div>

      {loadingSignals && (
        <div className="grid grid-cols-1 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded border border-border bg-card p-3">
              <Skeleton className="h-3 w-24 mb-3" />
              <Skeleton className="h-28 w-full" />
            </div>
          ))}
        </div>
      )}

      {signals && (
        <div className="grid grid-cols-1 gap-3">
          {signals.map((signal) => (
            <SignalCard
              key={signal.id}
              entityId={entityId}
              signal={signal}
              start={start}
              end={end}
              step={step}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SignalCard({
  entityId,
  signal,
  start,
  end,
  step,
}: {
  entityId: string;
  signal: { id: string; label: string; unit: string; color: string };
  start: string;
  end: string;
  step: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["signal-data", entityId, signal.id, start, end, step],
    queryFn: () => metricsApi.entitySignalData(entityId, signal.id, start, end, step),
    retry: false,
  });

  const latest = data?.data?.data?.result?.[0]?.values?.at(-1)?.[1];
  const latestFormatted = latest != null ? formatValue(parseFloat(latest), signal.unit) : null;

  return (
    <div className="rounded border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <span className="text-micro text-muted-foreground">{signal.label}</span>
        {latestFormatted && (
          <span className="tabular-nums text-[12px] font-medium" style={{ color: signal.color }}>
            {latestFormatted}
          </span>
        )}
      </div>
      <div className="p-3">
        {isLoading ? (
          <div className="animate-pulse h-28 rounded bg-muted/30" />
        ) : (
          <MetricChart
            data={data?.data ?? null}
            color={signal.color}
            unit={signal.unit}
            height={120}
          />
        )}
      </div>
    </div>
  );
}

function formatValue(value: number, unit: string): string {
  if (unit === "%") return `${value.toFixed(1)}%`;
  if (unit === "ms") return `${value.toFixed(0)} ms`;
  if (unit === "req/s") return `${value.toFixed(2)}/s`;
  return value.toFixed(2);
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start px-3 py-2 gap-4">
      <span className="text-[12px] text-muted-foreground w-40 shrink-0">{label}</span>
      <span className="text-[12px] text-foreground">{value}</span>
    </div>
  );
}
