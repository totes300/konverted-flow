"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { IconChevronDown } from "@tabler/icons-react";
import { Id } from "@/convex/_generated/dataModel";
import { formatDuration, parseTimeInput } from "@/lib/time-parser";
import { TimeEntryList } from "./time-entry-list";
import { cn } from "@/lib/utils";

const PRESETS = [
  { label: "15m", seconds: 15 * 60 },
  { label: "30m", seconds: 30 * 60 },
  { label: "45m", seconds: 45 * 60 },
  { label: "1h", seconds: 60 * 60 },
  { label: "2h", seconds: 2 * 60 * 60 },
  { label: "3h", seconds: 3 * 60 * 60 },
  { label: "4h", seconds: 4 * 60 * 60 },
  { label: "6h", seconds: 6 * 60 * 60 },
  { label: "8h", seconds: 8 * 60 * 60 },
];

interface TimePopoverProps {
  taskId: Id<"tasks">;
  totalSeconds: number;
  onAddTime: (seconds: number) => void;
}

export function TimePopover({
  taskId,
  totalSeconds,
  onAddTime,
}: TimePopoverProps) {
  const [customInput, setCustomInput] = useState("");
  const [entriesOpen, setEntriesOpen] = useState(false);

  const parseResult = useMemo(
    () => parseTimeInput(customInput),
    [customInput]
  );

  const handlePresetClick = (seconds: number) => {
    onAddTime(seconds);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseResult.isValid && parseResult.seconds > 0) {
      onAddTime(parseResult.seconds);
      setCustomInput("");
    }
  };

  return (
    <div className="w-80">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm text-muted-foreground">Total Time</span>
        <span className="text-lg font-semibold tabular-nums">
          {formatDuration(totalSeconds)}
        </span>
      </div>

      <Separator />

      {/* Quick Add Section */}
      <div className="px-4 py-3 space-y-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Quick Add
        </span>

        {/* Preset buttons grid */}
        <div className="grid grid-cols-5 gap-1.5">
          {PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              onClick={() => handlePresetClick(preset.seconds)}
              className="h-8 px-0 text-xs"
            >
              {preset.label}
            </Button>
          ))}
        </div>

        {/* Custom input */}
        <form onSubmit={handleCustomSubmit} className="flex gap-2">
          <Input
            type="text"
            placeholder="e.g. 1h 30m"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            className={cn(
              "h-8 text-sm",
              customInput && !parseResult.isValid && "border-destructive"
            )}
          />
          <Button
            type="submit"
            size="sm"
            className="h-8 px-3"
            disabled={!parseResult.isValid || parseResult.seconds <= 0}
          >
            Add
          </Button>
        </form>

        {/* Preview or hint */}
        {customInput ? (
          <p
            className={cn(
              "text-xs",
              parseResult.isValid
                ? "text-muted-foreground"
                : "text-destructive"
            )}
          >
            {parseResult.isValid
              ? `Will add: ${parseResult.formatted}`
              : parseResult.error}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Formats: 30m, 2h, 1d, 1h 30m, 1.5h
          </p>
        )}
      </div>

      <Separator />

      {/* Recent Entries Section */}
      <Collapsible open={entriesOpen} onOpenChange={setEntriesOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/50">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Time Entries
            </span>
            <IconChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                entriesOpen && "rotate-180"
              )}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <TimeEntryList taskId={taskId} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
