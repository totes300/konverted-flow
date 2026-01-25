"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { IconDotsVertical, IconPencil, IconArchive, IconPlus, IconLoader2 } from "@tabler/icons-react";
import { ClientDialog } from "./client-dialog";
import { toast } from "sonner";

// Types
interface Client {
  _id: Id<"clients">;
  name: string;
  email?: string;
  defaultHourlyRate?: number;
}

interface ClientListProps {
  clients: Client[];
}

// Utility functions
function formatCurrency(amount?: number): string {
  if (amount === undefined || amount === null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

// Empty state component
function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-background py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <IconPlus className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">No clients yet</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm px-4">
        Get started by adding your first client. Clients help you organize tasks
        and track billable time.
      </p>
      <Button onClick={onCreateClick} className="mt-6">
        <IconPlus className="mr-2 h-4 w-4" />
        Add Client
      </Button>
    </div>
  );
}

// Main component
export function ClientList({ clients }: ClientListProps) {
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [archivingClient, setArchivingClient] = useState<Client | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const archiveClient = useMutation(api.clients.archive);

  const handleArchive = async () => {
    if (!archivingClient) return;

    setIsArchiving(true);
    try {
      await archiveClient({ id: archivingClient._id });
      toast.success(`"${archivingClient.name}" has been archived`);
      setArchivingClient(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to archive client";
      toast.error(message);
      console.error("Archive error:", error);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleCloseEditDialog = (open: boolean) => {
    if (!open) {
      setEditingClient(null);
    }
  };

  const handleCloseArchiveDialog = (open: boolean) => {
    if (!open && !isArchiving) {
      setArchivingClient(null);
    }
  };

  if (clients.length === 0) {
    return (
      <>
        <EmptyState onCreateClick={() => setIsCreateOpen(true)} />
        <ClientDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      </>
    );
  }

  return (
    <>
      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Hourly Rate</TableHead>
              <TableHead className="w-[70px]">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client._id}>
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {client.email || "-"}
                </TableCell>
                <TableCell>{formatCurrency(client.defaultHourlyRate)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`Actions for ${client.name}`}
                      >
                        <IconDotsVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setEditingClient(client)}
                      >
                        <IconPencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setArchivingClient(client)}
                        className="text-destructive focus:text-destructive"
                      >
                        <IconArchive className="mr-2 h-4 w-4" />
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <ClientDialog
        key={editingClient?._id ?? "create"}
        open={!!editingClient}
        onOpenChange={handleCloseEditDialog}
        client={editingClient ?? undefined}
      />

      {/* Archive Confirmation Dialog */}
      <AlertDialog
        open={!!archivingClient}
        onOpenChange={handleCloseArchiveDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive &ldquo;{archivingClient?.name}
              &rdquo;? This client will no longer appear in the list and cannot
              be selected for new tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={isArchiving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isArchiving && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
