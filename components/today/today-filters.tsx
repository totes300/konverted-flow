"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTodayFilters, TodayGroupByOption } from "@/hooks/use-today-filters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  IconChevronDown,
  IconX,
  IconLayoutRows,
  IconCheck,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { formatDuration } from "@/lib/time-parser";

interface TodayFiltersProps {
  completedCount: number;
  totalCount: number;
  totalTimeToday: number;
  isGrouped: boolean;
}

export function TodayFilters({ completedCount, totalCount, totalTimeToday, isGrouped }: TodayFiltersProps) {
  const { filters, setFilters, clearFilters, hasFilters } = useTodayFilters();

  const [clientOpen, setClientOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);

  const clients = useQuery(api.clients.list);
  const users = useQuery(api.users.listByOrg);

  const handleClientSelect = (clientId: Id<"clients"> | null) => {
    setFilters({ clientId: clientId || undefined });
    setClientOpen(false);
  };

  const handleAssigneeSelect = (userId: Id<"users"> | null) => {
    setFilters({ assigneeId: userId || undefined });
    setAssigneeOpen(false);
  };

  const handleClearClient = () => {
    setFilters({ clientId: undefined });
  };

  const handleClearAssignee = () => {
    setFilters({ assigneeId: undefined });
  };

  // Get display names for active filters
  const selectedClientName = filters.clientId
    ? clients?.find((c) => c._id === filters.clientId)?.name
    : null;

  const selectedAssigneeName = filters.assigneeId
    ? users?.find((u) => u._id === filters.assigneeId)?.name
    : null;

  return (
    <div className="space-y-3">
      {/* Filter Bar */}
      <div className="flex items-center gap-2">
        {/* Client Filter */}
        <Popover open={clientOpen} onOpenChange={setClientOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 gap-1.5",
                filters.clientId && "border-primary/50"
              )}
            >
              Client
              {filters.clientId && (
                <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
              <IconChevronDown className="ml-1 h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search clients..." />
              <CommandList>
                <CommandEmpty>No clients found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => handleClientSelect(null)}
                    className="justify-between"
                  >
                    All clients
                    {!filters.clientId && (
                      <IconCheck className="h-4 w-4 text-primary" />
                    )}
                  </CommandItem>
                  {clients?.map((client) => (
                    <CommandItem
                      key={client._id}
                      value={client.name}
                      onSelect={() => handleClientSelect(client._id)}
                      className="justify-between"
                    >
                      {client.name}
                      {filters.clientId === client._id && (
                        <IconCheck className="h-4 w-4 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Assignee Filter */}
        <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 gap-1.5",
                filters.assigneeId && "border-primary/50"
              )}
            >
              Assignee
              {filters.assigneeId && (
                <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
              <IconChevronDown className="ml-1 h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search people..." />
              <CommandList>
                <CommandEmpty>No users found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => handleAssigneeSelect(null)}
                    className="justify-between"
                  >
                    All assignees
                    {!filters.assigneeId && (
                      <IconCheck className="h-4 w-4 text-primary" />
                    )}
                  </CommandItem>
                  {users?.map((user) => (
                    <CommandItem
                      key={user._id}
                      value={user.name}
                      onSelect={() => handleAssigneeSelect(user._id)}
                      className="justify-between"
                    >
                      {user.name}
                      {filters.assigneeId === user._id && (
                        <IconCheck className="h-4 w-4 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Stats - only shown when not grouped (groups show their own stats) */}
        {!isGrouped && totalCount > 0 && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">{completedCount}/{totalCount}</span> done
            </span>
            {totalTimeToday > 0 && (
              <>
                <span className="text-muted-foreground/40">•</span>
                <span>
                  <span className="font-medium text-foreground">{formatDuration(totalTimeToday)}</span> tracked
                </span>
              </>
            )}
          </div>
        )}

        {/* Group By */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-9 gap-1.5",
                    filters.groupBy !== "none" && "border-primary/50"
                  )}
                >
                  <IconLayoutRows className="h-4 w-4" />
                  Group
                  <IconChevronDown className="ml-1 h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Group by</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Group by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={filters.groupBy}
              onValueChange={(value) =>
                setFilters({ groupBy: value as TodayGroupByOption })
              }
            >
              <DropdownMenuRadioItem value="none">None</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="client">Client</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="priority">Priority</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="parent">Parent Task</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active Filter Pills */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Client Pill */}
          {selectedClientName && (
            <Badge
              variant="secondary"
              className="h-7 gap-1 pl-2.5 pr-1.5 font-normal"
            >
              {selectedClientName}
              <button
                onClick={handleClearClient}
                className="ml-0.5 rounded-sm p-0.5 hover:bg-background/50"
              >
                <IconX className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {/* Assignee Pill */}
          {selectedAssigneeName && (
            <Badge
              variant="secondary"
              className="h-7 gap-1 pl-2.5 pr-1.5 font-normal"
            >
              {selectedAssigneeName}
              <button
                onClick={handleClearAssignee}
                className="ml-0.5 rounded-sm p-0.5 hover:bg-background/50"
              >
                <IconX className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {/* Clear All */}
          <button
            onClick={clearFilters}
            className="ml-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
