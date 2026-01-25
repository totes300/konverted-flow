"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { IconUser } from "@tabler/icons-react";

interface ClientCellProps {
  taskId: Id<"tasks">;
  clientId?: Id<"clients">;
  clientName?: string;
  isSubtask?: boolean;
}

export function ClientCell({ taskId, clientId, clientName, isSubtask }: ClientCellProps) {
  const updateTask = useMutation(api.tasks.update);
  const clients = useQuery(api.clients.list);

  const handleChange = async (value: string) => {
    if (isSubtask) return; // Subtasks cannot change client

    try {
      const newClientId = value === "none" ? undefined : (value as Id<"clients">);
      await updateTask({ id: taskId, clientId: newClientId });
    } catch {
      toast.error("Failed to update client");
    }
  };

  if (isSubtask) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground">
        <IconUser className="h-4 w-4" />
        <span className="truncate">{clientName || "No client"}</span>
      </div>
    );
  }

  return (
    <Select value={clientId ?? "none"} onValueChange={handleChange}>
      <SelectTrigger className="h-8 w-full border-none shadow-none bg-transparent hover:bg-muted/30 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:border-transparent">
        <SelectValue placeholder="No client">
          <div className="flex items-center gap-2 truncate">
            <IconUser className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate text-sm">{clientName || "No client"}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">
          <span className="text-muted-foreground">No client</span>
        </SelectItem>
        {clients?.map((client) => (
          <SelectItem key={client._id} value={client._id}>
            {client.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
