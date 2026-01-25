"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { IconArrowLeft } from "@tabler/icons-react";
import { ReportWizard } from "@/components/reports/report-wizard";

export default function NewReportPage() {
  return (
    <>
      <div className="flex items-center gap-4 px-4 lg:px-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/reports">
            <IconArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to reports</span>
          </Link>
        </Button>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">New Report</h1>
          <p className="text-sm text-muted-foreground">
            Create a new time report for a client.
          </p>
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <ReportWizard />
      </div>
    </>
  );
}
