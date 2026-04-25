import { cn } from "@/lib/utils";

interface AudioMeterProps {
  level: number; // 0..1
  bars?: number;
  className?: string;
}

export function AudioMeter({ level, bars = 12, className }: AudioMeterProps) {
  return (
    <div className={cn("flex items-end gap-1 h-8", className)}>
      {Array.from({ length: bars }).map((_, i) => {
        const threshold = (i + 1) / bars;
        const active = level >= threshold * 0.85;
        const height = 30 + i * 4;
        const isHot = i > bars * 0.7;
        return (
          <div
            key={i}
            className={cn(
              "w-1.5 rounded-full transition-all duration-75",
              active
                ? isHot
                  ? "bg-warning shadow-[0_0_8px_oklch(0.78_0.16_65/0.6)]"
                  : "bg-primary shadow-[0_0_8px_oklch(0.82_0.14_75/0.5)]"
                : "bg-muted/40",
            )}
            style={{ height: `${height}%` }}
          />
        );
      })}
    </div>
  );
}
