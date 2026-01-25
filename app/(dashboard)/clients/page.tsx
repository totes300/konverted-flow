"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { IconPlus } from "@tabler/icons-react";
import { ClientList } from "@/components/clients/client-list";
import { ClientDialog } from "@/components/clients/client-dialog";

export default function ClientsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const clients = useQuery(api.clients.list);

  const isLoading = clients === undefined;
  const hasClients = clients && clients.length > 0;

  return (
    <>
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">
            Manage your clients and their billing rates.
          </p>
        </div>
        {hasClients && (
          <Button onClick={() => setIsCreateOpen(true)}>
            <IconPlus className="mr-2 h-4 w-4" />
            New Client
          </Button>
        )}
      </div>

      <div className="px-4 lg:px-6">
        {isLoading ? <LoadingSkeleton /> : <ClientList clients={clients} />}
      </div>

      <ClientDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </>
  );
}

function LoadingSkeleton() {
  return (
    <div className="rounded-md border bg-background">
      <div className="border-b px-4 py-3">
        <Skeleton className="h-4 w-full max-w-[200px]" />
      </div>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b px-4 py-4 last:border-0"
        >
          <Skeleton className="h-4 w-[150px]" />
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[80px]" />
          <Skeleton className="ml-auto h-8 w-8" />
        </div>
      ))}
    </div>
  );
}
