import {
  LayoutDashboard, Eye, TrendingUp, ArrowRightLeft,
  ArrowDownToLine, FileText,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/curator-console", icon: LayoutDashboard },
  { title: "Vault Overview", url: "/curator-console/vault-overview", icon: Eye },
  { title: "NAV Management", url: "/curator-console/nav", icon: TrendingUp, badge: "high" },
  { title: "Redemption", url: "/curator-console/redemption", icon: ArrowRightLeft, badge: "high" },
  { title: "Deposit Vault", url: "/curator-console/deposit-vault", icon: ArrowDownToLine },
  { title: "Audit Log", url: "/curator-console/audit-log", icon: FileText },
];

export function CuratorSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const isActive = (path: string) =>
    path === "/curator-console"
      ? location.pathname === path
      : location.pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent className="pt-4">
        <SidebarGroup>
          {!collapsed && (
            <div className="px-3 pb-4">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-foreground text-sm">Term</span>
                <span className="font-display font-bold text-primary text-sm">Max</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
                Curator Console
              </span>
            </div>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/curator-console"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && (
                        <span className="flex items-center gap-2">
                          {item.title}
                          {item.badge === "high" && (
                            <span className="text-[9px] bg-primary/20 text-primary px-1 rounded font-mono">HF</span>
                          )}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
