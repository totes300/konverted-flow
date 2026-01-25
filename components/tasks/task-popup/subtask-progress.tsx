"use client";

interface SubtaskProgressProps {
  completed: number;
  total: number;
}

export function SubtaskProgress({ completed, total }: SubtaskProgressProps) {
  const percentage = total > 0 ? (completed / total) * 100 : 0;

  if (total === 0) {
    return (
      <span className="text-xs text-muted-foreground tabular-nums">
        0/0
      </span>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm text-muted-foreground tabular-nums">
        {completed}/{total}
      </span>
    </div>
  );
}
