"use client";

import { use } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { ReportEditor } from "@/components/reports/report-editor";

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

export default function ReportPage({ params }: ReportPageProps) {
  const { id } = use(params);

  return <ReportEditor reportId={id as Id<"reports">} />;
}
