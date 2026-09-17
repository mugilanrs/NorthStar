export type TimeRange = "15m" | "1h" | "6h" | "24h" | "7d";

export const TIME_RANGE_OPTIONS: { label: string; value: TimeRange }[] = [
  { label: "15m", value: "15m" },
  { label: "1h",  value: "1h"  },
  { label: "6h",  value: "6h"  },
  { label: "24h", value: "24h" },
  { label: "7d",  value: "7d"  },
];

const RANGE_SECONDS: Record<TimeRange, number> = {
  "15m":  15 * 60,
  "1h":   60 * 60,
  "6h":   6  * 60 * 60,
  "24h":  24 * 60 * 60,
  "7d":   7  * 24 * 60 * 60,
};

const STEP_SECONDS: Record<TimeRange, string> = {
  "15m": "30s",
  "1h":  "60s",
  "6h":  "5m",
  "24h": "10m",
  "7d":  "1h",
};

export function getRangeParams(range: TimeRange): { start: string; end: string; step: string } {
  const now = Math.floor(Date.now() / 1000);
  const start = now - RANGE_SECONDS[range];
  return {
    start: String(start),
    end: String(now),
    step: STEP_SECONDS[range],
  };
}
