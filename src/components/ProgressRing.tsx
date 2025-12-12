import React from "react";
import { Check } from "lucide-react";

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  label?: React.ReactNode;
  strokeColor?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  max,
  size = 64,
  strokeWidth = 6,
  label,
  strokeColor,
}) => {
  const safeMax = max > 0 ? max : 1;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = clamped / safeMax;
  const dashoffset = circumference - progress * circumference;
  const ringColor = strokeColor || "hsl(var(--primary))";
  const isComplete = clamped >= safeMax;
  const displayLabel =
    isComplete
      ? <Check className="w-4 h-4" />
      : label === undefined
        ? `${Math.round(progress * 100)}%`
        : label;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted-foreground)/0.2)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {displayLabel !== null && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-foreground">
          {displayLabel}
        </div>
      )}
    </div>
  );
};
