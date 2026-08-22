"use client";

import dynamic from 'next/dynamic';
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { DataProvider } from "@/lib/contexts/DataContext";
import { OrgThemeProvider } from "@/components/OrgThemeProvider";

import { CalendarSidebarProvider } from "@/components/calendar/CalendarSidebarProvider";
const CalendarSidebar = dynamic(() => import("@/components/calendar/CalendarSidebar").then(m => m.CalendarSidebar), { ssr: false });
import { GlobalDialogs } from "@/components/core-ui/GlobalDialogs";
import { useIsMobile } from "@/hooks/use-mobile";
import { QuickCreateProvider } from "@/components/core-ui/QuickCreateProvider";

const EMAIL_SIDEBAR_WIDTH = 420;

function DashboardContent({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const rightMargin = 0;

  return (
    <SidebarInset
      className="flex-1 min-w-0 min-h-0 max-w-full overflow-hidden transition-all duration-200 ease-out"
      style={{ marginRight: rightMargin }}
    >
      <AppHeader />
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {children}
      </div>
    </SidebarInset>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DataProvider>
      <OrgThemeProvider>
        <QuickCreateProvider>
              <CalendarSidebarProvider>
                <SidebarProvider className="!h-svh !min-h-0 overflow-hidden" style={{ "--sidebar-width": "68px" } as React.CSSProperties}>
                  <AppSidebar />
                  <DashboardContent>{children}</DashboardContent>
                  <CalendarSidebar />
                  <GlobalDialogs />
                </SidebarProvider>
              </CalendarSidebarProvider>
        </QuickCreateProvider>
      </OrgThemeProvider>
    </DataProvider>
  );
}
