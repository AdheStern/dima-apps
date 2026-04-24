"use client";

import {
  AppWindowIcon,
  BookOpenIcon,
  Building2Icon,
  CommandIcon,
  HeadphonesIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";
import type * as React from "react";

import { NavMain } from "@/components/navigation/nav-main";
import { NavUser } from "@/components/navigation/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: AppWindowIcon,
    },
    {
      title: "Soportes",
      url: "/tickets",
      icon: HeadphonesIcon,
    },
    {
      title: "Clientes",
      url: "/clients",
      icon: Building2Icon,
    },
    {
      title: "Administración",
      url: "/administration",
      icon: ShieldCheckIcon,
      items: [
        { title: "Usuarios", url: "/administration" },
        { title: "Tipos de SLA", url: "/administration/sla-types" },
        { title: "Tipos de Soporte", url: "/administration/support-types" },
      ],
    },
    {
      title: "Configuraciones",
      url: "/settings",
      icon: SettingsIcon,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      collapsible="icon"
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <CommandIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">DIMA</span>
                  <span className="truncate text-xs">Sistema de Soportes</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}

