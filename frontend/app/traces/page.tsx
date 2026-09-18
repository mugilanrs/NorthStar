"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Search, RefreshCw, AlertCircle, CheckCircle2, Clock, Layers } from "lucide-react";
import { tracesApi, TraceSearchResult, metricsApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

const TIME_RANGES = [
  { label: "Last 15 min", seconds: 900 },
  { label: "Last 1 hour", seconds: 3600 },
  { label: "Last 6 hours", seconds: 21600 },
  { label: "Last 24 hours", seconds: 86400 },
];

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Error", value: "error" },
  { label: "OK", value: "ok" },
];

function formatDuration(ms: number): string {
  if (ms < 1) return "<1ms";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatAgo(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

function DurationBar({
  duration,
  max,
  status,
}: {
  duration: number;
  max: number;
  status: "ok" | "error" | "unset";
}) {
  const pct = max > 0 ? (duration / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 w-[120px]">
      <div className="flex-1 h-1.5 rounded bg-muted overflow-hidden">
        <div
          className={`h-full rounded ${status === "error" ? "bg-rose-500" : "bg-cyan-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground w-12 text-right">
        {formatDuration(duration)}
      </span>
    </div>
  );
}

export default function TracesPage() {
  const router = useRouter();
  const [service, setService] = useState("");
  const [status, setStatus] = useState("");
  const [minDuration, setMinDuration] = useState("");
  const [timeRange, setTimeRange] = useState(3600);

  // Fetch service names for dropdown
  const { data: servicesData } = useQuery({
    queryKey: ["label-values", "service_name"],
    queryFn: () => metricsApi.labelValues("service_name"),
    staleTime: 300_000,
  });

  const now = Math.floor(Date.now() / 1000);
  const searchParams = {
    service: service || undefined,
    status: status || undefined,
    minDuration: minDuration || undefined,
    limit: 50,
    start: now - timeRange,
    end: now,
  };

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["traces", searchParams],
    queryFn: () => tracesApi.search(searchParams),
    staleTime: 30_000,
  });

  const traces = data?.traces ?? [];
  const maxDuration = traces.length > 0 ? Math.max(...traces.map((t) => t.duration_ms)) : 1;
  const errorCount = traces.filter((t) => t.status === "error").length;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-medium">Trace Explorer</h2>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 rounded border border-border bg-card px-3 py-2.5">
        {/* Service */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Service</span>
          <select
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="rounded border border-border bg-background px-2 py-1 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All</option>
            {(servicesData?.values ?? []).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Status</span>
          <div className="flex rounded border border-border overflow-hidden">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatus(opt.value)}
                className={`px-2.5 py-1 text-[11px] transition-colors ${
                  status === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Min Duration */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Min duration</span>
          <input
            type="text"
            value={minDuration}
            onChange={(e) => setMinDuration(e.target.value)}
            placeholder="e.g. 100ms"
            className="w-24 rounded border border-border bg-background px-2 py-1 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Time range */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[11px] text-muted-foreground">Range</span>
          <div className="flex rounded border border-border overflow-hidden">
            {TIME_RANGES.map((r) => (
              <button
                key={r.seconds}
                onClick={() => setTimeRange(r.seconds)}
                className={`px-2.5 py-1 text-[11px] transition-colors ${
                  timeRange === r.seconds
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats strip */}
      {data && (
        <div className="flex gap-4 text-[11px]">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">{traces.length}</span>{" "}
            traces
          </span>
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-rose-500">
              <AlertCircle size={10} />
              <span className="font-medium tabular-nums">{errorCount}</span> errors
            </span>
          )}
        </div>
      )}

      {/* Results */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded border border-border bg-card p-6 text-[12px] text-destructive">
          Failed to load traces: {(error as Error).message}
        </div>
      )}

      {data && traces.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 gap-2 text-[12px] text-muted-foreground">
          <Search size={20} className="opacity-40" />
          <p>No traces found for this time range.</p>
          <p className="text-[11px]">Try extending the range or removing filters.</p>
        </div>
      )}

      {data && traces.length > 0 && (
        <div className="flex-1 overflow-auto min-h-0 rounded border border-border bg-card">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_140px_80px_80px_100px] px-3 py-1.5 border-b border-border bg-muted/30 text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
            <span>Root Operation</span>
            <span>Duration</span>
            <span className="text-center">Spans</span>
            <span>Status</span>
            <span>Started</span>
          </div>

          {/* Rows */}
          {traces.map((trace) => (
            <TraceRow
              key={trace.trace_id}
              trace={trace}
              maxDuration={maxDuration}
              onClick={() => router.push(`/traces/${trace.trace_id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TraceRow({
  trace,
  maxDuration,
  onClick,
}: {
  trace: TraceSearchResult;
  maxDuration: number;
  onClick: () => void;
}) {
  const isError = trace.status === "error";

  return (
    <div
      onClick={onClick}
      className="grid grid-cols-[1fr_140px_80px_80px_100px] items-center px-3 py-2 border-b border-border last:border-b-0 cursor-pointer hover:bg-muted/30 transition-colors group"
    >
      {/* Operation */}
      <div className="min-w-0 flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground truncate shrink-0">
          {trace.root_service}
        </span>
        <span className="text-muted-foreground/40">›</span>
        <span className="text-[11px] text-foreground truncate group-hover:text-cyan-400 transition-colors">
          {trace.root_name}
        </span>
      </div>

      {/* Duration bar */}
      <DurationBar duration={trace.duration_ms} max={maxDuration} status={trace.status} />

      {/* Span count */}
      <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
        <Layers size={10} />
        {trace.span_count > 0 ? trace.span_count : "—"}
      </div>

      {/* Status */}
      <div>
        {isError ? (
          <span className="flex items-center gap-1 text-[11px] text-rose-500">
            <AlertCircle size={10} />
            Error
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] text-emerald-400">
            <CheckCircle2 size={10} />
            OK
          </span>
        )}
      </div>

      {/* Time */}
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
        <Clock size={10} />
        {formatAgo(trace.start_ms)}
      </div>
    </div>
  );
}
