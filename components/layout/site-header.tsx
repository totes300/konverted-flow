"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { TimerWidget } from "./timer-widget";

const routeNames: Record<string, string> = {
  tasks: "Tasks",
  today: "Today",
  clients: "Clients",
  review: "Admin Review",
};

export function SiteHeader() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const currentPage = segments[0] || "tasks";
  const pageName = routeNames[currentPage] || currentPage;

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center justify-between gap-1 px-4 lg:gap-2 lg:px-6">
        <div className="flex items-center gap-1 lg:gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-base font-medium">{pageName}</h1>
        </div>
        <Suspense fallback={null}>
          <TimerWidget />
        </Suspense>
      </div>
    </header>
  );
}
