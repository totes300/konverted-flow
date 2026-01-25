"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { IconLoader2 } from "@tabler/icons-react";

// Constants
const MAX_NAME_LENGTH = 200;

// Form validation schema
const clientFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(MAX_NAME_LENGTH, `Name must be ${MAX_NAME_LENGTH} characters or less`)
    .transform((val) => val.trim()),
  email: z
    .string()
    .email("Please enter a valid email address")
    .or(z.literal(""))
    .transform((val) => val.trim()),
  defaultHourlyRate: z
    .string()
    .refine(
      (val) => val === "" || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0),
      "Please enter a valid non-negative number"
    ),
});

type ClientFormInput = z.infer<typeof clientFormSchema>;

// Output values (what we submit to the API)
export interface ClientFormValues {
  name: string;
  email?: string;
  defaultHourlyRate?: number;
}

interface ClientFormProps {
  defaultValues?: {
    name: string;
    email?: string;
    defaultHourlyRate?: number;
  };
  onSubmit: (values: ClientFormValues) => Promise<void>;
  isSubmitting?: boolean;
}

export function ClientForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
}: ClientFormProps) {
  const form = useForm<ClientFormInput>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      email: defaultValues?.email ?? "",
      defaultHourlyRate: defaultValues?.defaultHourlyRate?.toString() ?? "",
    },
  });

  // Reset form when defaultValues change (switching between edit/create)
  useEffect(() => {
    form.reset({
      name: defaultValues?.name ?? "",
      email: defaultValues?.email ?? "",
      defaultHourlyRate: defaultValues?.defaultHourlyRate?.toString() ?? "",
    });
  }, [defaultValues, form]);

  const handleSubmit = async (values: ClientFormInput) => {
    const submitValues: ClientFormValues = {
      name: values.name,
      email: values.email || undefined,
      defaultHourlyRate: values.defaultHourlyRate
        ? parseFloat(values.defaultHourlyRate)
        : undefined,
    };

    await onSubmit(submitValues);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4"
        noValidate
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Name <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Client name"
                  maxLength={MAX_NAME_LENGTH}
                  autoComplete="organization"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="client@example.com"
                  autoComplete="email"
                  {...field}
                />
              </FormControl>
              <FormDescription>Optional contact email</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="defaultHourlyRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default Hourly Rate</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  inputMode="decimal"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Default rate for time tracking (USD)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
            {defaultValues ? "Save Changes" : "Create Client"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
