"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { PrometheusRangeResult } from "@/lib/api";

interface DataPoint {
  t: number;       // unix ms
  value: number;
}

function toChartData(result: PrometheusRangeResult): DataPoint[] {
  const series = result.data?.result?.[0];
  if (!series?.values) return [];
  return series.values.map(([ts, val]) => ({
    t: ts * 1000,
    value: parseFloat(val) || 0,
  }));
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatValue(value: number, unit: string): string {
  if (unit === "%") return `${value.toFixed(1)}%`;
  if (unit === "ms") return `${value.toFixed(0)}ms`;
  if (unit === "req/s") return `${value.toFixed(2)}/s`;
  return value.toFixed(2);
}

export function MetricChart({
  data,
  color = "#22D3EE",
  unit = "",
  height = 120,
  showAxes = true,
}: {
  data: PrometheusRangeResult | null | undefined;
  color?: string;
  unit?: string;
  height?: number;
  showAxes?: boolean;
}) {
  if (!data) return <ChartSkeleton height={height} />;

  const points = toChartData(data);

  if (points.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-[11px] text-muted-foreground"
        style={{ height }}
      >
        No data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.15} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        {showAxes && (
          <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
        )}

        {showAxes && (
          <XAxis
            dataKey="t"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={formatTime}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            minTickGap={60}
          />
        )}

        {showAxes && (
          <YAxis
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(v) => formatValue(v, unit)}
          />
        )}

        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null;
            const { t, value } = payload[0].payload as DataPoint;
            return (
              <div className="rounded border border-border bg-card px-2 py-1.5 text-[11px] shadow-md">
                <p className="text-muted-foreground">{formatTime(t)}</p>
                <p className="tabular-nums font-medium" style={{ color }}>
                  {formatValue(value, unit)}
                </p>
              </div>
            );
          }}
        />

        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#grad-${color.replace("#", "")})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SparklineChart({
  data,
  color = "#22D3EE",
  unit = "",
  height = 36,
}: {
  data: PrometheusRangeResult | null | undefined;
  color?: string;
  unit?: string;
  height?: number;
}) {
  return <MetricChart data={data} color={color} unit={unit} height={height} showAxes={false} />;
}

function ChartSkeleton({ height }: { height: number }) {
  return (
    <div
      className="animate-pulse rounded bg-muted/30"
      style={{ height }}
    />
  );
}
