"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Clock, Layers, AlertCircle, CheckCircle2 } from "lucide-react";
import { tracesApi } from "@/lib/api";
import { TraceWaterfall } from "@/components/traces/trace-waterfall";
import { Skeleton } from "@/components/ui/skeleton";

function formatDuration(ms: number): string {
  if (ms < 1) return "<1ms";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(3)}s`;
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString();
}

export default function TraceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data, isLoading, error } = useQuery({
    queryKey: ["trace", id],
    queryFn: () => tracesApi.get(id),
    staleTime: 60_000,
  });

  const hasError = data?.spans.some((s) => s.status === "error");

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Back nav */}
      <div className="flex items-center gap-3">
        <Link
          href="/traces"
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={12} />
          Trace Explorer
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="font-mono text-[11px] text-foreground">
          {id.slice(0, 16)}…
        </span>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="flex-1 h-[500px]" />
        </div>
      )}

      {error && (
        <div className="rounded border border-border bg-card p-6 text-[12px] text-destructive">
          Failed to load trace: {(error as Error).message}
        </div>
      )}

      {data && (
        <>
          {/* Trace header */}
          <div className="rounded border border-border bg-card px-4 py-3 flex flex-wrap gap-6 text-[12px]">
            <Stat
              icon={
                hasError ? (
                  <AlertCircle size={13} className="text-rose-500" />
                ) : (
                  <CheckCircle2 size={13} className="text-emerald-400" />
                )
              }
              label="Status"
              value={hasError ? "Error" : "OK"}
            />
            <Stat
              icon={<Clock size={13} className="text-muted-foreground" />}
              label="Duration"
              value={formatDuration(data.duration_ms)}
            />
            <Stat
              icon={<Layers size={13} className="text-muted-foreground" />}
              label="Spans"
              value={String(data.spans.length)}
            />
            <Stat
              icon={<Layers size={13} className="text-muted-foreground" />}
              label="Services"
              value={String(data.service_count)}
            />
            <Stat
              icon={<Clock size={13} className="text-muted-foreground" />}
              label="Started"
              value={formatTime(data.start_ms)}
            />
          </div>

          {/* Waterfall */}
          {data.spans.length === 0 ? (
            <div className="rounded border border-border bg-card p-6 text-[12px] text-muted-foreground">
              No spans found for this trace.
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-hidden rounded border border-border bg-card p-4">
              <TraceWaterfall
                spans={data.spans}
                traceStart={data.start_ms}
                traceDuration={data.duration_ms}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
