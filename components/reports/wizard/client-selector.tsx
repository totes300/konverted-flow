"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface ClientSelectorProps {
  value: Id<"clients"> | null;
  onChange: (clientId: Id<"clients">) => void;
}

export function ClientSelector({ value, onChange }: ClientSelectorProps) {
  const clients = useQuery(api.clients.list);

  if (clients === undefined) {
    return (
      <div className="space-y-2">
        <Label>Client</Label>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="space-y-2">
        <Label>Client</Label>
        <p className="text-sm text-muted-foreground">
          No clients found. Please create a client first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="client-select">
        Client <span className="text-destructive">*</span>
      </Label>
      <Select
        value={value ?? undefined}
        onValueChange={(val) => onChange(val as Id<"clients">)}
      >
        <SelectTrigger id="client-select">
          <SelectValue placeholder="Select a client" />
        </SelectTrigger>
        <SelectContent>
          {clients.map((client) => (
            <SelectItem key={client._id} value={client._id}>
              {client.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
