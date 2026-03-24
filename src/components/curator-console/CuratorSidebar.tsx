import {
  LayoutDashboard,
  Eye,
  TrendingUp,
  ArrowRightLeft,
  ArrowDownToLine,
  Activity,
  ChevronLeft,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useMatch } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { curatorVaultBasePath } from "@/lib/curatorConsolePaths";
import { normalizeVaultAddress } from "@/lib/evmAddress";

const vaultNavItems = [
  { title: "Vault Overview", segment: "overview" as const, icon: Eye },
  { title: "Price Management", segment: "nav" as const, icon: TrendingUp, badge: "high" as const },
  { title: "Redemption Management", segment: "redemption" as const, icon: ArrowRightLeft, badge: "high" as const },
  { title: "Depsoit Management", segment: "deposit" as const, icon: ArrowDownToLine },
  { title: "Activity", segment: "activity" as const, icon: Activity },
];

export function CuratorSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const vaultMatch = useMatch({ path: "/curator-console/vault/:chainId/:address", end: false });
  const chainId = vaultMatch?.params.chainId;
  const addressRaw = vaultMatch?.params.address;
  const inVaultContext = Boolean(chainId && addressRaw);

  const vaultBase =
    inVaultContext && chainId && addressRaw
      ? curatorVaultBasePath(chainId, normalizeVaultAddress(addressRaw))
      : null;

  const isListHome = location.pathname === "/curator-console";

  const isVaultNavActive = (segment: string) => {
    if (!vaultBase) return false;
    return location.pathname === `${vaultBase}/${segment}` || location.pathname.startsWith(`${vaultBase}/${segment}/`);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent className="pt-4">
        <SidebarGroup>
          {!collapsed && (
            <div className="px-3 pb-4">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-foreground text-sm">TermMax</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
                Curator Console
              </span>
            </div>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {inVaultContext && vaultBase ? (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/curator-console"
                      className="hover:bg-sidebar-accent/50 text-muted-foreground"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {!collapsed && <span>All strategy vaults</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isListHome}>
                    <NavLink
                      to="/curator-console"
                      end
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      {!collapsed && <span>Strategy vaults</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {inVaultContext &&
                vaultBase &&
                vaultNavItems.map((item) => {
                  const to = `${vaultBase}/${item.segment}`;
                  return (
                    <SidebarMenuItem key={item.segment}>
                      <SidebarMenuButton asChild isActive={isVaultNavActive(item.segment)}>
                        <NavLink
                          to={to}
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
                  );
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
