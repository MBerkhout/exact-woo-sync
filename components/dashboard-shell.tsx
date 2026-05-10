"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import type { TenantRole } from "@/lib/auth/requireTenant";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/connectors", label: "Connectors" },
  { href: "/pairs", label: "Connector pairs" },
  { href: "/logs", label: "Logs" },
  { href: "/settings/tenant", label: "Tenant settings" },
  { href: "/settings/users", label: "Users" },
];

export function DashboardShell({
  children,
  role,
}: {
  children: React.ReactNode;
  role: TenantRole;
}) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="gap-2 px-4 py-3">
          <div className="font-semibold tracking-tight">Exact ↔ Woo</div>
          <div className="text-muted-foreground text-xs capitalize">{role}</div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigate</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {nav.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={
                        item.href === "/"
                          ? pathname === "/"
                          : pathname.startsWith(item.href)
                      }
                      render={<Link href={item.href}>{item.label}</Link>}
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className={cn("text-muted-foreground text-sm")}>
            Multi-tenant middleware (Phase 1 shell)
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
