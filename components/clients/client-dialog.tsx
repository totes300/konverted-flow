"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClientForm, ClientFormValues } from "./client-form";
import { toast } from "sonner";
import { Currency } from "@/lib/report-utils";

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: {
    _id: Id<"clients">;
    name: string;
    email?: string;
    defaultHourlyRate?: number;
    currency?: Currency;
  };
}

export function ClientDialog({ open, onOpenChange, client }: ClientDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createClient = useMutation(api.clients.create);
  const updateClient = useMutation(api.clients.update);

  const isEditing = !!client;

  const handleSubmit = async (values: ClientFormValues) => {
    setIsSubmitting(true);
    try {
      if (isEditing) {
        await updateClient({
          id: client._id,
          name: values.name,
          email: values.email || undefined,
          defaultHourlyRate: values.defaultHourlyRate,
          currency: values.currency,
        });
        toast.success("Client updated successfully");
      } else {
        await createClient({
          name: values.name,
          email: values.email || undefined,
          defaultHourlyRate: values.defaultHourlyRate,
          currency: values.currency,
        });
        toast.success("Client created successfully");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? "Failed to update client" : "Failed to create client");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Client" : "New Client"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Make changes to the client details."
              : "Add a new client to your organization."}
          </DialogDescription>
        </DialogHeader>
        <ClientForm
          defaultValues={
            client
              ? {
                  name: client.name,
                  email: client.email,
                  defaultHourlyRate: client.defaultHourlyRate,
                  currency: client.currency,
                }
              : undefined
          }
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}
