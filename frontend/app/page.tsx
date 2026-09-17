"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { entities } from "@/lib/api";
import { ServiceHealthCard } from "@/components/dashboard/service-health-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { data: allEntities, isLoading } = useQuery({
    queryKey: ["entities"],
    queryFn: () => entities.list({ entity_type: "service" }),
    refetchInterval: 30_000,
  });

  const services = allEntities ?? [];
  const healthyCnt  = services.filter((e) => e.health_status === "healthy").length;
  const criticalCnt = services.filter((e) => e.health_status === "critical").length;
  const degradedCnt = services.filter((e) => e.health_status === "degraded").length;

  // Sort: critical first, then degraded, then healthy
  const sortedServices = [...services].sort((a, b) => {
    const order = { critical: 0, degraded: 1, healthy: 2, unknown: 3 };
    return (order[a.health_status as keyof typeof order] ?? 3) - (order[b.health_status as keyof typeof order] ?? 3);
  });

  const topServices = sortedServices.slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-medium">Ops Center</h2>
        <span className="text-micro text-muted-foreground">Live · 30s refresh</span>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Active Incidents" value="—" icon={AlertTriangle} color="text-destructive" />
        <KpiCard label="P1 Open" value="—" icon={Activity} color="text-primary" />
        <KpiCard label="SLA at Risk" value="—" icon={Clock} color="text-warning" />
        <KpiCard
          label="Services Healthy"
          value={isLoading ? "—" : `${healthyCnt}/${services.length}`}
          icon={CheckCircle}
          color={criticalCnt > 0 ? "text-destructive" : degradedCnt > 0 ? "text-warning" : "text-success"}
        />
      </div>

      {/* Service Health Cards */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-micro text-muted-foreground">Service Health</span>
          {criticalCnt > 0 && (
            <span className="text-micro text-destructive">{criticalCnt} critical</span>
          )}
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded border border-border bg-card p-3 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && topServices.length === 0 && (
          <div className="rounded border border-border bg-card p-4 text-center text-[12px] text-muted-foreground">
            No services discovered yet. Deploy the data generator and run entity discovery.
          </div>
        )}

        {!isLoading && topServices.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {topServices.map((entity) => (
              <ServiceHealthCard key={entity.id} entity={entity} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded border border-border bg-card p-3 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-micro text-muted-foreground">{label}</span>
        <Icon size={12} strokeWidth={1.5} className={color} />
      </div>
      <p className={`text-[28px] font-light tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
