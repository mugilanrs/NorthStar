"use client";

import { useState } from "react";
import { Span } from "@/lib/api";
import { SpanDetail } from "./span-detail";

interface Props {
  spans: Span[];
  traceStart: number;
  traceDuration: number;
}

// Deterministic service → color index
const COLORS = [
  "bg-cyan-400",
  "bg-violet-400",
  "bg-amber-400",
  "bg-emerald-400",
  "bg-rose-400",
];
const TEXT_COLORS = [
  "text-cyan-400",
  "text-violet-400",
  "text-amber-400",
  "text-emerald-400",
  "text-rose-400",
];

function buildTree(spans: Span[]): { span: Span; depth: number }[] {
  const byId = new Map(spans.map((s) => [s.span_id, s]));
  const children = new Map<string | null, Span[]>();
  for (const s of spans) {
    const key = s.parent_id && byId.has(s.parent_id) ? s.parent_id : null;
    if (!children.has(key)) children.set(key, []);
    children.get(key)!.push(s);
  }

  const result: { span: Span; depth: number }[] = [];
  function walk(parentId: string | null, depth: number) {
    const kids = (children.get(parentId) ?? []).sort(
      (a, b) => a.start_ms - b.start_ms
    );
    for (const s of kids) {
      result.push({ span: s, depth });
      walk(s.span_id, depth + 1);
    }
  }
  walk(null, 0);
  // Fallback: include any spans not reached (orphans)
  const seen = new Set(result.map((r) => r.span.span_id));
  for (const s of spans) {
    if (!seen.has(s.span_id)) result.push({ span: s, depth: 0 });
  }
  return result;
}

function formatDuration(ms: number): string {
  if (ms < 1) return "<1ms";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTimeMarker(ms: number): string {
  if (ms === 0) return "0";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function TraceWaterfall({ spans, traceStart, traceDuration }: Props) {
  const [selected, setSelected] = useState<Span | null>(null);

  const services = Array.from(new Set(spans.map((s) => s.service)));
  const colorIndex = (svc: string) => services.indexOf(svc) % COLORS.length;

  const rows = buildTree(spans);

  const markers = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    pct: f * 100,
    label: formatTimeMarker(f * traceDuration),
  }));

  return (
    <div className="flex gap-4 h-full min-h-0">
      {/* Waterfall table */}
      <div className="flex-1 overflow-auto min-w-0">
        {/* Service legend */}
        <div className="flex flex-wrap gap-3 mb-3">
          {services.map((svc, i) => (
            <span
              key={svc}
              className={`flex items-center gap-1.5 text-[11px] ${TEXT_COLORS[i % TEXT_COLORS.length]}`}
            >
              <span
                className={`inline-block h-2 w-2 rounded-sm ${COLORS[i % COLORS.length]}`}
              />
              {svc}
            </span>
          ))}
        </div>

        {/* Timeline header */}
        <div className="flex mb-1">
          <div className="w-[240px] shrink-0" />
          <div className="flex-1 relative h-4">
            {markers.map((m) => (
              <span
                key={m.pct}
                className="absolute top-0 text-[10px] text-muted-foreground tabular-nums"
                style={{ left: `${m.pct}%`, transform: m.pct > 0 ? "translateX(-50%)" : undefined }}
              >
                {m.label}
              </span>
            ))}
          </div>
        </div>

        {/* Span rows */}
        <div className="border border-border rounded overflow-hidden">
          {rows.map(({ span, depth }, idx) => {
            const leftPct =
              traceDuration > 0
                ? ((span.start_ms - traceStart) / traceDuration) * 100
                : 0;
            const widthPct =
              traceDuration > 0
                ? Math.max((span.duration_ms / traceDuration) * 100, 0.4)
                : 0.4;
            const ci = colorIndex(span.service);
            const isError = span.status === "error";
            const isSelected = selected?.span_id === span.span_id;

            return (
              <div
                key={span.span_id}
                className={`flex items-center h-8 border-b border-border last:border-b-0 cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-muted/60"
                    : "hover:bg-muted/30"
                }`}
                onClick={() => setSelected(isSelected ? null : span)}
              >
                {/* Left: indent + label */}
                <div
                  className="w-[240px] shrink-0 flex items-center gap-1.5 px-2 overflow-hidden"
                  style={{ paddingLeft: `${8 + depth * 14}px` }}
                >
                  <span
                    className={`inline-block h-2 w-2 shrink-0 rounded-sm ${
                      isError ? "bg-rose-500" : COLORS[ci]
                    }`}
                  />
                  <span className="truncate text-[11px] text-foreground">
                    {span.operation}
                  </span>
                </div>

                {/* Right: timeline bar */}
                <div className="flex-1 relative h-full flex items-center">
                  {/* Grid lines */}
                  {[25, 50, 75].map((p) => (
                    <div
                      key={p}
                      className="absolute top-0 bottom-0 w-px bg-border/50"
                      style={{ left: `${p}%` }}
                    />
                  ))}
                  {/* Bar */}
                  <div
                    className={`absolute h-4 rounded-sm ${
                      isError
                        ? "bg-rose-500/40 border border-rose-500"
                        : `${COLORS[ci]} opacity-70`
                    }`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  />
                  {/* Duration label */}
                  <span
                    className="absolute text-[10px] tabular-nums text-muted-foreground ml-1 whitespace-nowrap"
                    style={{ left: `${Math.min(leftPct + widthPct, 90)}%` }}
                  >
                    {formatDuration(span.duration_ms)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Span detail drawer */}
      {selected && (
        <SpanDetail
          span={selected}
          traceId={spans[0]?.span_id ? "" : ""}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
