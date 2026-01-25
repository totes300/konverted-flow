"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
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
import {
  IconDotsVertical,
  IconPencil,
  IconTrash,
  IconPlus,
  IconLoader2,
  IconFileReport,
} from "@tabler/icons-react";
import { toast } from "sonner";
import Link from "next/link";
import {
  formatCurrency,
  formatDateRange,
  formatSecondsAsDecimalHours,
  Currency,
} from "@/lib/report-utils";

// ============================================
// Types
// ============================================

/**
 * Report item as returned from the paginated list query.
 */
export interface ReportListItem {
  _id: Id<"reports">;
  name: string;
  startDate: string;
  endDate: string;
  totalSeconds: number;
  totalAmount: number;
  createdAt: number;
  updatedAt: number;
  clientName: string;
  clientCurrency?: Currency;
}

interface ReportsListProps {
  /** Array of reports to display */
  reports: ReportListItem[];
  /** Whether there are more reports to load */
  hasMore?: boolean;
  /** Callback to load more reports */
  onLoadMore?: () => void;
  /** Whether more reports are currently loading */
  isLoadingMore?: boolean;
}

// ============================================
// Helpers
// ============================================

/**
 * Format timestamp to human-readable date.
 */
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ============================================
// Empty State
// ============================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-background py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <IconFileReport className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">No reports yet</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm px-4">
        Create your first report to track time and generate invoices for your
        clients.
      </p>
      <Button asChild className="mt-6">
        <Link href="/reports/new">
          <IconPlus className="mr-2 h-4 w-4" />
          Create Report
        </Link>
      </Button>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

/**
 * Displays a list of reports in a table format.
 * Supports pagination via "Load More" button.
 */
export function ReportsList({
  reports,
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
}: ReportsListProps) {
  const router = useRouter();
  const [deletingReport, setDeletingReport] = useState<ReportListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const removeReport = useMutation(api.reports.remove);

  const handleDelete = async () => {
    if (!deletingReport) return;

    setIsDeleting(true);
    try {
      await removeReport({ id: deletingReport._id });
      toast.success(`Report "${deletingReport.name}" has been deleted`);
      setDeletingReport(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete report";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseDeleteDialog = (open: boolean) => {
    if (!open && !isDeleting) {
      setDeletingReport(null);
    }
  };

  const handleRowClick = (reportId: Id<"reports">) => {
    router.push(`/reports/${reportId}`);
  };

  if (reports.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Date Range</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Edited</TableHead>
              <TableHead className="w-[70px]">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((report) => (
              <TableRow
                key={report._id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleRowClick(report._id)}
              >
                <TableCell className="font-medium">
                  {report.clientName}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDateRange(report.startDate, report.endDate)}
                </TableCell>
                <TableCell className="text-right">
                  {formatSecondsAsDecimalHours(report.totalSeconds)}h
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(
                    report.totalAmount,
                    report.clientCurrency || "USD"
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(report.createdAt)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(report.updatedAt)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`Actions for ${report.name}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconDotsVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/reports/${report._id}`);
                        }}
                      >
                        <IconPencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingReport(report);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <IconTrash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Load More */}
      {hasMore && onLoadMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore && (
              <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Load More
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingReport}
        onOpenChange={handleCloseDeleteDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deletingReport?.name}
              &rdquo;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && (
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
