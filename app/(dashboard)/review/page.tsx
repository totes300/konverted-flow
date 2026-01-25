"use client";

import { IconShield } from "@tabler/icons-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

export default function ReviewPage() {
  return (
    <>
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Admin Review</h1>
          <p className="text-sm text-muted-foreground">
            Review and approve tasks submitted by team members.
          </p>
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <IconShield className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Coming Soon</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm text-center">
              Admin review will be implemented in Milestone 8.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
