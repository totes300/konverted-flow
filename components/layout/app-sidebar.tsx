"use client";

import {
  IconChecklist,
  IconSun,
  IconUsers,
  IconShield,
  IconInnerShadowTop,
  IconClockHour4,
  IconFileReport,
} from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const currentUser = useQuery(api.users.getCurrentUser);
  const isAdmin = currentUser?.role === "admin";

  const navItems = [
    {
      title: "Tasks",
      url: "/tasks",
      icon: IconChecklist,
    },
    {
      title: "Today",
      url: "/today",
      icon: IconSun,
    },
    {
      title: "Timesheet",
      url: "/timesheet",
      icon: IconClockHour4,
    },
    {
      title: "Clients",
      url: "/clients",
      icon: IconUsers,
    },
    {
      title: "Reports",
      url: "/reports",
      icon: IconFileReport,
    },
  ];

  if (isAdmin) {
    navItems.push({
      title: "Admin Review",
      url: "/review",
      icon: IconShield,
    });
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/tasks">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Konverted</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
