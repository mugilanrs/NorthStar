"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { entities, type Entity } from "@/lib/api";
import { HealthDot } from "@/components/entities/health-dot";
import { EntityIcon } from "@/components/entities/entity-icon";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const TYPE_ORDER = ["service", "database", "host", "pod", "container"];

export default function CmdbPage() {
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["entities"],
    queryFn: () => entities.list(),
    refetchInterval: 30_000,
  });

  const discover = useMutation({
    mutationFn: entities.triggerDiscovery,
    onSuccess: () => setTimeout(() => qc.invalidateQueries({ queryKey: ["entities"] }), 3000),
  });

  const sorted = [...(data ?? [])].sort((a, b) => {
    const ai = TYPE_ORDER.indexOf(a.entity_type);
    const bi = TYPE_ORDER.indexOf(b.entity_type);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.name.localeCompare(b.name);
  });

  const counts = {
    healthy:  sorted.filter((e) => e.health_status === "healthy").length,
    degraded: sorted.filter((e) => e.health_status === "degraded").length,
    critical: sorted.filter((e) => e.health_status === "critical").length,
    unknown:  sorted.filter((e) => e.health_status === "unknown").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-medium">CMDB</h2>
          <p className="text-[12px] text-muted-foreground">
            Auto-discovered from OTel resource attributes
          </p>
        </div>

        <div className="flex items-center gap-3">
          {Object.entries(counts).map(([status, count]) => (
            <span key={status} className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <HealthDot status={status} />
              {count}
            </span>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1.5 text-[12px]"
            onClick={() => discover.mutate()}
            disabled={discover.isPending}
          >
            <RefreshCw size={12} className={discover.isPending ? "animate-spin" : ""} />
            Discover
          </Button>
        </div>
      </div>

      <div className="rounded border border-border overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-micro text-muted-foreground text-left px-3 py-2 w-6" />
              <th className="text-micro text-muted-foreground text-left px-3 py-2">Name</th>
              <th className="text-micro text-muted-foreground text-left px-3 py-2">Type</th>
              <th className="text-micro text-muted-foreground text-left px-3 py-2">Namespace</th>
              <th className="text-micro text-muted-foreground text-left px-3 py-2">Health</th>
              <th className="text-micro text-muted-foreground text-left px-3 py-2">Error Rate</th>
              <th className="text-micro text-muted-foreground text-left px-3 py-2">p99 Latency</th>
              <th className="text-micro text-muted-foreground text-left px-3 py-2">Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-3 py-2.5">
                      <Skeleton className="h-3 w-full" />
                    </td>
                  ))}
                </tr>
              ))}

            {error && (
              <tr>
                <td colSpan={8} className="px-3 py-4 text-center text-muted-foreground text-[12px]">
                  Could not reach the backend. Start the API server and try again.
                </td>
              </tr>
            )}

            {!isLoading && !error && sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground text-[12px]">
                  No entities discovered yet.{" "}
                  <button
                    onClick={() => discover.mutate()}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Run discovery
                  </button>{" "}
                  or wait for the Celery beat (30s interval).
                </td>
              </tr>
            )}

            {sorted.map((entity) => (
              <EntityRow key={entity.id} entity={entity} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EntityRow({ entity }: { entity: Entity }) {
  const errorRate = entity.labels["error_rate"];
  const p99 = entity.labels["p99_ms"];

  return (
    <tr className="border-b border-border/50 hover:bg-accent/30 transition-colors">
      <td className="px-3 py-2.5 text-muted-foreground">
        <EntityIcon type={entity.entity_type} size={13} />
      </td>
      <td className="px-3 py-2.5">
        <Link
          href={`/cmdb/${entity.id}`}
          className="font-mono text-[12px] text-foreground hover:text-primary transition-colors"
        >
          {entity.name}
        </Link>
      </td>
      <td className="px-3 py-2.5">
        <Badge variant="outline" className="text-[11px] h-5 font-normal">
          {entity.entity_type}
        </Badge>
      </td>
      <td className="px-3 py-2.5 text-muted-foreground text-[12px]">
        {entity.namespace ?? "—"}
      </td>
      <td className="px-3 py-2.5">
        <HealthDot status={entity.health_status} showLabel />
      </td>
      <td className="px-3 py-2.5 tabular-nums text-[12px] text-muted-foreground">
        {errorRate != null ? `${(Number(errorRate) * 100).toFixed(1)}%` : "—"}
      </td>
      <td className="px-3 py-2.5 tabular-nums text-[12px] text-muted-foreground">
        {p99 != null ? `${Number(p99).toFixed(0)} ms` : "—"}
      </td>
      <td className="px-3 py-2.5 text-[12px] text-muted-foreground">
        {entity.last_seen_at
          ? new Date(entity.last_seen_at).toLocaleTimeString()
          : "—"}
      </td>
    </tr>
  );
}
