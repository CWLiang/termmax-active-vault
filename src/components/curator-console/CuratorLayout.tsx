import { SidebarProvider } from "@/components/ui/sidebar";
import { CuratorSidebar } from "./CuratorSidebar";
import { CuratorHeader } from "./CuratorHeader";
import { Outlet } from "react-router-dom";

export function CuratorLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <CuratorSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <CuratorHeader />
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
