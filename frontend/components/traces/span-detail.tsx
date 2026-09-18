"use client";

import { X, ExternalLink } from "lucide-react";
import { Span } from "@/lib/api";
import Link from "next/link";

interface Props {
  span: Span;
  traceId: string;
  onClose: () => void;
}

const STATUS_STYLE = {
  ok: "text-emerald-400",
  error: "text-rose-500",
  unset: "text-muted-foreground",
};

function formatDuration(ms: number): string {
  if (ms < 1) return "<1ms";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(3)}s`;
}

function formatTime(ms: number): string {
  return new Date(ms).toISOString().replace("T", " ").replace("Z", " UTC");
}

export function SpanDetail({ span, traceId, onClose }: Props) {
  const attrEntries = Object.entries(span.attributes).filter(
    ([k]) => !["service.name", "service.version", "deployment.environment"].includes(k)
  );

  return (
    <div className="w-[400px] shrink-0 border border-border rounded bg-card flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-[12px] font-medium truncate">{span.operation}</span>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="overflow-auto flex-1 px-3 py-3 space-y-4">
        {/* Core fields */}
        <section className="space-y-1.5">
          <Row label="Service" value={span.service} />
          <Row
            label="Status"
            value={
              <span className={STATUS_STYLE[span.status]}>
                {span.status.toUpperCase()}
              </span>
            }
          />
          <Row label="Duration" value={formatDuration(span.duration_ms)} mono />
          <Row label="Start" value={formatTime(span.start_ms)} mono />
          <Row
            label="Span ID"
            value={span.span_id.slice(0, 16) + "…"}
            mono
          />
          {span.parent_id && (
            <Row
              label="Parent ID"
              value={span.parent_id.slice(0, 16) + "…"}
              mono
            />
          )}
        </section>

        {/* Attributes */}
        {attrEntries.length > 0 && (
          <section>
            <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground mb-1.5">
              Attributes
            </p>
            <div className="rounded border border-border overflow-hidden">
              {attrEntries.map(([k, v]) => (
                <div
                  key={k}
                  className="flex border-b border-border last:border-b-0 text-[11px]"
                >
                  <div className="w-[140px] shrink-0 px-2 py-1 text-muted-foreground font-mono truncate border-r border-border bg-muted/20">
                    {k}
                  </div>
                  <div className="flex-1 px-2 py-1 font-mono text-foreground break-all">
                    {v}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* View Logs link */}
        <section>
          <Link
            href={`/logs?trace_id=${span.span_id}`}
            className="flex items-center gap-1.5 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ExternalLink size={11} />
            View correlated logs
          </Link>
        </section>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2 text-[11px]">
      <span className="w-[90px] shrink-0 text-muted-foreground">{label}</span>
      <span className={`text-foreground flex-1 break-all ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
