"use client";

import { useQuery } from "@tanstack/react-query";
import { topologyApi } from "@/lib/api";
import { TopologyGraph } from "@/components/charts/topology-graph";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, AlertTriangle, CheckCircle2, Circle } from "lucide-react";

const HEALTH_COLOR: Record<string, string> = {
  healthy: "#22D3EE",
  degraded: "#F59E0B",
  critical: "#EF4444",
  unknown: "#6B7280",
};

export default function ServicesPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["topology"],
    queryFn: topologyApi.get,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const healthy = data?.nodes.filter(n => n.health_status === "healthy").length ?? 0;
  const degraded = data?.nodes.filter(n => n.health_status === "degraded").length ?? 0;
  const critical = data?.nodes.filter(n => n.health_status === "critical").length ?? 0;
  const total = data?.nodes.length ?? 0;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-medium">Service Topology</h2>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats strip */}
      {data && (
        <div className="flex gap-4 text-[11px]">
          <StatBadge icon={<Circle size={10} />} label="Total" value={total} color="#6B7280" />
          <StatBadge
            icon={<CheckCircle2 size={10} />}
            label="Healthy"
            value={healthy}
            color={HEALTH_COLOR.healthy}
          />
          {degraded > 0 && (
            <StatBadge
              icon={<AlertTriangle size={10} />}
              label="Degraded"
              value={degraded}
              color={HEALTH_COLOR.degraded}
            />
          )}
          {critical > 0 && (
            <StatBadge
              icon={<AlertTriangle size={10} />}
              label="Critical"
              value={critical}
              color={HEALTH_COLOR.critical}
            />
          )}
          <span className="ml-auto text-muted-foreground">
            {data.edges.length} call {data.edges.length === 1 ? "path" : "paths"}
          </span>
        </div>
      )}

      {/* Graph card */}
      <div className="flex-1 rounded border border-border bg-card overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col gap-3 p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="flex-1" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-[12px] text-muted-foreground">
            <span className="text-destructive mr-2">⚠</span>
            Failed to load topology
          </div>
        )}

        {data && data.nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[12px] text-muted-foreground">
            <p>No services discovered yet.</p>
            <p className="text-[11px]">
              Trigger{" "}
              <code className="rounded bg-muted px-1">POST /entities/discover</code>{" "}
              then reload.
            </p>
          </div>
        )}

        {data && data.nodes.length > 0 && (
          <>
            <TopologyGraph nodes={data.nodes} edges={data.edges} />

            {/* Legend */}
            <div className="absolute bottom-3 right-3 flex gap-3 rounded border border-border bg-card/80 px-3 py-1.5 text-[10px] backdrop-blur">
              {Object.entries(HEALTH_COLOR).map(([status, color]) => (
                <span key={status} className="flex items-center gap-1">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {status}
                </span>
              ))}
            </div>

            {data.edges.length === 0 && (
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 rounded border border-border bg-card/90 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
                Edges loading — auto-refresh in 15 s
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatBadge({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <span className="flex items-center gap-1" style={{ color }}>
      {icon}
      <span className="font-medium">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}
