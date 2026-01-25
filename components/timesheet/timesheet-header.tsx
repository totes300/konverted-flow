"use client";

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TimesheetPeriod } from "@/lib/timesheet-utils";

interface TimesheetHeaderProps {
  period: TimesheetPeriod;
  onPeriodChange: (period: TimesheetPeriod) => void;
  onNavigatePrevious: () => void;
  onNavigateNext: () => void;
  onGoToToday: () => void;
}

export function TimesheetHeader({
  period,
  onPeriodChange,
  onNavigatePrevious,
  onNavigateNext,
  onGoToToday,
}: TimesheetHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      {/* Navigation */}
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" onClick={onNavigatePrevious}>
          <IconChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={onGoToToday}>
          Today
        </Button>
        <Button variant="outline" size="icon" onClick={onNavigateNext}>
          <IconChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Period Toggle */}
      <ToggleGroup
        type="single"
        value={period}
        onValueChange={(value) => {
          if (value) onPeriodChange(value as TimesheetPeriod);
        }}
        variant="outline"
      >
        <ToggleGroupItem value="week">Week</ToggleGroupItem>
        <ToggleGroupItem value="biweek">2 Weeks</ToggleGroupItem>
        <ToggleGroupItem value="month">Month</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
