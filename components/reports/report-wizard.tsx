"use client";

import { useState, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  IconArrowLeft,
  IconArrowRight,
  IconLoader2,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { ClientSelector } from "./wizard/client-selector";
import { DateRangeSelector } from "./wizard/date-range-selector";
import { ReportPreview } from "./wizard/report-preview";
import { generateReportName, ReportEntry } from "@/lib/report-utils";

const STEPS = [
  { title: "Select Client", description: "Choose the client for this report" },
  { title: "Date Range", description: "Select the reporting period" },
  { title: "Review & Adjust", description: "Review tasks and adjust times" },
];

export function ReportWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [clientId, setClientId] = useState<Id<"clients"> | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [entries, setEntries] = useState<ReportEntry[]>([]);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isCreating, setIsCreating] = useState(false);

  const clients = useQuery(api.clients.list);
  const createReport = useMutation(api.reports.create);

  const selectedClient = clients?.find((c) => c._id === clientId);

  // Warn user before leaving with unsaved data
  useEffect(() => {
    const hasData = entries.length > 0 && currentStep === 2;
    if (!hasData) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [entries.length, currentStep]);

  const handleDateRangeChange = useCallback((start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  }, []);

  const handleEntriesChange = useCallback((newEntries: ReportEntry[]) => {
    setEntries(newEntries);
  }, []);

  const handleTotalsChange = useCallback((seconds: number, amount: number) => {
    setTotalSeconds(seconds);
    setTotalAmount(amount);
  }, []);

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return clientId !== null;
      case 1:
        return startDate !== null && endDate !== null && startDate <= endDate;
      case 2:
        // Must have entries with positive total time
        return entries.length > 0 && totalSeconds > 0;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreate = async () => {
    if (!clientId || !startDate || !endDate || !selectedClient) return;

    // Client-side validation
    if (entries.length === 0) {
      toast.error("Report must have at least one task entry");
      return;
    }

    if (totalSeconds <= 0) {
      toast.error("Report must have time entries with positive duration");
      return;
    }

    setIsCreating(true);
    try {
      const reportName = generateReportName(selectedClient.name, startDate);

      await createReport({
        clientId,
        name: reportName,
        startDate,
        endDate,
        entries: entries.map((e) => ({
          taskId: e.taskId,
          taskTitle: e.taskTitle,
          taskDescription: e.taskDescription,
          taskCategory: e.taskCategory,
          parentTaskId: e.parentTaskId,
          parentTaskTitle: e.parentTaskTitle,
          originalSeconds: e.originalSeconds,
          adjustedSeconds: e.adjustedSeconds,
        })),
        totalSeconds,
        totalAmount,
      });

      toast.success("Report created successfully");
      router.push("/reports");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create report";
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step indicators */}
      <div className="flex items-center justify-center gap-4">
        {STEPS.map((step, index) => (
          <div key={index} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                index <= currentStep
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {index + 1}
            </div>
            <span
              className={`ml-2 hidden sm:inline text-sm ${
                index === currentStep ? "font-medium" : "text-muted-foreground"
              }`}
            >
              {step.title}
            </span>
            {index < STEPS.length - 1 && (
              <div className="ml-4 h-px w-8 bg-border" />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep].title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {STEPS[currentStep].description}
          </p>
        </CardHeader>
        <CardContent>
          {currentStep === 0 && (
            <ClientSelector value={clientId} onChange={setClientId} />
          )}

          {currentStep === 1 && (
            <DateRangeSelector
              startDate={startDate}
              endDate={endDate}
              onChange={handleDateRangeChange}
            />
          )}

          {currentStep === 2 && clientId && startDate && endDate && (
            <ReportPreview
              clientId={clientId}
              startDate={startDate}
              endDate={endDate}
              onEntriesChange={handleEntriesChange}
              onTotalsChange={handleTotalsChange}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          <IconArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Next
            <IconArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleCreate} disabled={!canProceed() || isCreating}>
            {isCreating && (
              <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Report
          </Button>
        )}
      </div>
    </div>
  );
}
