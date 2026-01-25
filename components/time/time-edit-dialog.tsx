"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { parseTimeInput, formatDuration } from "@/lib/time-parser";
import { cn } from "@/lib/utils";

interface TimeEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryId: Id<"timeEntries">;
  currentDurationSeconds: number;
  currentDate: string;
}

export function TimeEditDialog({
  open,
  onOpenChange,
  entryId,
  currentDurationSeconds,
  currentDate,
}: TimeEditDialogProps) {
  const updateEntry = useMutation(api.timeEntries.update);

  const [durationInput, setDurationInput] = useState(
    formatDuration(currentDurationSeconds)
  );
  const [dateInput, setDateInput] = useState(currentDate);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parseResult = useMemo(
    () => parseTimeInput(durationInput),
    [durationInput]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!parseResult.isValid || parseResult.seconds <= 0) {
      toast.error("Please enter a valid duration");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      toast.error("Please enter a valid date (YYYY-MM-DD)");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateEntry({
        id: entryId,
        durationSeconds: parseResult.seconds,
        date: dateInput,
      });
      toast.success("Time entry updated");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update time entry:", error);
      toast.error("Failed to update time entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Edit Time Entry</DialogTitle>
          <DialogDescription>
            Update the duration and date for this time entry.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                value={durationInput}
                onChange={(e) => setDurationInput(e.target.value)}
                placeholder="e.g. 1h 30m"
                className={cn(
                  durationInput && !parseResult.isValid && "border-destructive"
                )}
              />
              {durationInput && (
                <p
                  className={cn(
                    "text-xs",
                    parseResult.isValid
                      ? "text-muted-foreground"
                      : "text-destructive"
                  )}
                >
                  {parseResult.isValid
                    ? `Duration: ${parseResult.formatted}`
                    : parseResult.error}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!parseResult.isValid || isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
