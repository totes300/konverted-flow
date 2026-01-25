"use client";

import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TimesheetCell } from "./timesheet-cell";
import { formatColumnDate, formatDuration } from "@/lib/timesheet-utils";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { parseISO, isToday, isWeekend } from "date-fns";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface User {
  _id: Id<"users">;
  name: string;
  avatarUrl?: string;
}

interface TimeEntryWithTask {
  _id: Id<"timeEntries">;
  userId: Id<"users">;
  taskId: Id<"tasks">;
  date: string;
  durationSeconds: number;
  task: {
    _id: Id<"tasks">;
    title: string;
    isDeleted: boolean;
  } | null;
}

interface TimesheetGridProps {
  users: User[] | undefined;
  entries: TimeEntryWithTask[] | undefined;
  dates: string[];
  onTaskClick: (taskId: Id<"tasks">) => void;
  isLoading?: boolean;
}

export function TimesheetGrid({
  users,
  entries,
  dates,
  onTaskClick,
  isLoading,
}: TimesheetGridProps) {
  // Group entries by "userId-date" key
  const entriesByUserDate = useMemo(() => {
    if (!entries) return new Map<string, TimeEntryWithTask[]>();

    const map = new Map<string, TimeEntryWithTask[]>();
    for (const entry of entries) {
      const key = `${entry.userId}-${entry.date}`;
      const existing = map.get(key) || [];
      existing.push(entry);
      map.set(key, existing);
    }
    return map;
  }, [entries]);

  // Calculate totals per user
  const userTotals = useMemo(() => {
    if (!entries || !users) return new Map<string, number>();

    const map = new Map<string, number>();
    for (const user of users) {
      const total = entries
        .filter((e) => e.userId === user._id)
        .reduce((sum, e) => sum + e.durationSeconds, 0);
      map.set(user._id, total);
    }
    return map;
  }, [entries, users]);

  // Helper to get entries for a user on a date
  const getCellEntries = (userId: Id<"users">, date: string) => {
    return entriesByUserDate.get(`${userId}-${date}`) || [];
  };

  // Check date properties
  const getDateProps = (dateStr: string) => {
    const date = parseISO(dateStr);
    return {
      isToday: isToday(date),
      isWeekend: isWeekend(date),
    };
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="sticky left-0 z-10 bg-muted/40 w-[200px] p-3 text-left font-medium">
                    Team Member
                  </th>
                  {dates.slice(0, 7).map((date) => {
                    const { day, date: dateStr } = formatColumnDate(date);
                    const { isToday: today, isWeekend: weekend } = getDateProps(date);
                    return (
                      <th
                        key={date}
                        className={cn(
                          "min-w-[140px] p-3 text-center border-l border-border/30",
                          weekend && "bg-muted/50",
                          today && "bg-primary/10"
                        )}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-normal text-muted-foreground">
                            {day}
                          </span>
                          <span className={cn("text-sm font-semibold", today && "text-primary")}>
                            {dateStr}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                  <th className="min-w-[100px] p-3 text-center border-l border-border/30 bg-muted/40">
                    <span className="text-sm font-semibold">Total</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3].map((i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="sticky left-0 z-10 bg-background p-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    </td>
                    {dates.slice(0, 7).map((date) => (
                      <td key={date} className="min-w-[140px] p-3 border-l border-border/30">
                        <Skeleton className="h-20 w-full" />
                      </td>
                    ))}
                    <td className="min-w-[100px] p-3 border-l border-border/30">
                      <Skeleton className="h-6 w-16 ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!users || users.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">No team members found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="sticky left-0 z-10 bg-muted/40 w-[200px] p-3 text-left font-medium">
                  Team Member
                </th>
                {dates.map((date) => {
                  const { day, date: dateStr } = formatColumnDate(date);
                  const { isToday: today, isWeekend: weekend } = getDateProps(date);
                  return (
                    <th
                      key={date}
                      className={cn(
                        "min-w-[140px] p-3 text-center border-l border-border/30",
                        weekend && "bg-muted/50",
                        today && "bg-primary/10"
                      )}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-normal text-muted-foreground">
                          {day}
                        </span>
                        <span className={cn("text-sm font-semibold", today && "text-primary")}>
                          {dateStr}
                        </span>
                      </div>
                    </th>
                  );
                })}
                <th className="min-w-[100px] p-3 text-center border-l border-border/30 bg-muted/40">
                  <span className="text-sm font-semibold">Total</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id} className="border-b border-border/30 last:border-b-0">
                  <td className="sticky left-0 z-10 bg-background p-3 border-r border-border/30">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                        <AvatarFallback className="text-xs font-medium">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium truncate max-w-[130px]">
                        {user.name}
                      </span>
                    </div>
                  </td>
                  {dates.map((date) => {
                    const { isToday: today, isWeekend: weekend } = getDateProps(date);
                    return (
                      <TimesheetCell
                        key={`${user._id}-${date}`}
                        entries={getCellEntries(user._id, date)}
                        onTaskClick={onTaskClick}
                        isToday={today}
                        isWeekend={weekend}
                      />
                    );
                  })}
                  <td className="min-w-[100px] p-3 align-middle border-l border-border/30 bg-muted/20">
                    <div className="text-sm font-semibold text-right tabular-nums">
                      {formatDuration(userTotals.get(user._id) || 0)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
