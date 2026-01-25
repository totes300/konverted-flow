"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  getDateRangePresets,
  formatDateRange,
  formatDateToYMD,
} from "@/lib/report-utils";

interface DateRangeSelectorProps {
  startDate: string | null;
  endDate: string | null;
  onChange: (startDate: string, endDate: string) => void;
}

export function DateRangeSelector({
  startDate,
  endDate,
  onChange,
}: DateRangeSelectorProps) {
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const presets = getDateRangePresets();

  const handlePresetClick = (presetLabel: string) => {
    const preset = presets.find((p) => p.label === presetLabel);
    if (preset) {
      const range = preset.getRange();
      onChange(range.startDate, range.endDate);
      setActivePreset(presetLabel);
    }
  };

  const handleCustomDateChange = (
    field: "start" | "end",
    value: string
  ) => {
    setActivePreset(null);
    if (field === "start") {
      onChange(value, endDate || formatDateToYMD(new Date()));
    } else {
      onChange(startDate || formatDateToYMD(new Date()), value);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Quick Select</Label>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <Button
              key={preset.label}
              type="button"
              variant={activePreset === preset.label ? "default" : "outline"}
              size="sm"
              onClick={() => handlePresetClick(preset.label)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start-date">Start Date</Label>
          <Input
            id="start-date"
            type="date"
            value={startDate || ""}
            onChange={(e) => handleCustomDateChange("start", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end-date">End Date</Label>
          <Input
            id="end-date"
            type="date"
            value={endDate || ""}
            onChange={(e) => handleCustomDateChange("end", e.target.value)}
          />
        </div>
      </div>

      {startDate && endDate && (
        <p className="text-sm text-muted-foreground">
          Selected: {formatDateRange(startDate, endDate)}
        </p>
      )}
    </div>
  );
}
