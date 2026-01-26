"use client";

export function SubtaskTableHeader(): React.ReactElement {
  return (
    <div className="grid grid-cols-[1fr_140px_135px_145px_40px] items-center border-b border-border/30 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
      <span className="py-3 px-4">Name</span>
      <span className="py-3">Status</span>
      <span className="py-3">Priority</span>
      <span className="py-3">Time</span>
      <span className="py-3"></span>
    </div>
  );
}
