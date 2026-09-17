import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  healthy:  "bg-green-500",
  degraded: "bg-amber-500 animate-pulse-ring",
  critical: "bg-red-500 animate-pulse-ring",
  unknown:  "bg-muted-foreground/50",
};

const STATUS_LABELS: Record<string, string> = {
  healthy:  "Healthy",
  degraded: "Degraded",
  critical: "Critical",
  unknown:  "Unknown",
};

export function HealthDot({
  status,
  showLabel = false,
  size = "sm",
}: {
  status: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}) {
  const dot = STATUS_STYLES[status] ?? STATUS_STYLES.unknown;
  const dotSize = size === "md" ? "w-2.5 h-2.5" : "w-2 h-2";

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("rounded-full shrink-0", dot, dotSize)} />
      {showLabel && (
        <span className="text-[12px] text-muted-foreground">
          {STATUS_LABELS[status] ?? status}
        </span>
      )}
    </span>
  );
}
