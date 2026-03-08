import {
  BarChart3,
  Building2,
  Compass,
  ChevronRight,
  Users,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { ADMIN_SECTION_ITEMS, DEFAULT_ADMIN_SECTION_PATH } from "@/lib/admin-sections";
import { MAIN_NAV_ITEMS, UTILITY_NAV_ITEMS } from "@/lib/app-navigation";
import { useAuth } from "../auth";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useThemeSystem } from "@/components/theme/ThemeProvider";
import { getPlatformWorkspaceLabel, getWorkspaceDisplayName, isOrganizationWorkspaceContext } from "@/lib/tenant";

export function OrganizationScopeSelector({ compact = false, className }: { compact?: boolean; className?: string }) {
  const {
    user,
    organizationOptions,
    selectedOrganizationId,
    requiresOrganizationSelection,
    setSelectedOrganizationId,
  } = useAuth();

  const isElevatedUser = user?.role === "owner" || user?.role === "super_admin";
  if (!isElevatedUser || !requiresOrganizationSelection) {
    return null;
  }

  return (
    <div
      className={cn(
        compact
          ? "rounded-2xl border border-border/60 bg-card/72 p-3 backdrop-blur-sm"
          : "rounded-2xl border border-sidebar-border/50 bg-sidebar-background/70 p-3",
        className,
      )}
    >
      <div className={cn("mb-2 text-[11px] font-semibold uppercase tracking-[0.22em]", compact ? "text-muted-foreground" : "text-sidebar-foreground/55")}>
        Organization Scope
      </div>
      <select
        className={cn(
          "flex h-10 w-full rounded-xl border px-3 text-sm outline-none transition",
          compact
            ? "border-border/70 bg-background text-foreground focus:border-primary"
            : "border-sidebar-border/70 bg-sidebar-background text-sidebar-foreground focus:border-sidebar-primary",
        )}
        value={selectedOrganizationId ? String(selectedOrganizationId) : ""}
        onChange={(event) => setSelectedOrganizationId(event.target.value ? Number(event.target.value) : null)}
      >
        <option value="">Choose workspace scope</option>
        {organizationOptions.map((option) => (
          <option key={option.id} value={option.id}>{option.name}</option>
        ))}
      </select>
      <p className={cn("mt-2 text-xs leading-5", compact ? "text-muted-foreground" : "text-sidebar-foreground/60")}>
        Choose an organization or Owner Workspace to work inside that scope.
      </p>
    </div>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const {
    canModule,
    user,
    organizationOptions,
    selectedOrganizationId,
    selectedOrganizationName,
    requiresOrganizationSelection,
    setSelectedOrganizationId,
  } = useAuth();
  const { activeTheme } = useThemeSystem();
  const isElevatedUser = user?.role === "owner" || user?.role === "super_admin";
  const adminSectionItems = ADMIN_SECTION_ITEMS.filter((item) => {
    if (item.ownerOnly && !isElevatedUser) return false;
    if (item.requiresAssign && !canModule("admin", "assign")) return false;
    return canModule("admin");
  });
  const onAdminRoute = location.pathname.startsWith("/admin");
  const workspaceName = selectedOrganizationName
    || getWorkspaceDisplayName({
      role: user?.role,
      organizationName: user?.organization_name,
      organizationSlug: user?.organization_slug,
      tenantScope: user?.tenant_context?.scope,
    });
  const isOrganizationWorkspace = Boolean(selectedOrganizationName) || isOrganizationWorkspaceContext({
    organizationName: user?.organization_name,
    organizationSlug: user?.organization_slug,
    tenantScope: user?.tenant_context?.scope,
  });
  const WorkspaceIcon = isOrganizationWorkspace ? Building2 : BarChart3;

  const visibleMainItems = MAIN_NAV_ITEMS.filter((item) => item.module === "dashboard" || canModule(item.module));
  const visibleAdminItems = UTILITY_NAV_ITEMS.filter((item) => canModule(item.module));

  return (
    <Sidebar collapsible="icon" variant="floating" className="theme-dashboard-sidebar border-none">
      <SidebarHeader className="px-3 pb-1 pt-3">
        <div className={cn("flex items-center gap-3 rounded-2xl border border-sidebar-border/50 bg-sidebar-background/78 px-3 py-3", collapsed && "justify-center px-2") }>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_10px_24px_hsl(var(--sidebar-primary)/0.18)]">
            <WorkspaceIcon className="h-5 w-5" />
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-sidebar-foreground">{workspaceName || getPlatformWorkspaceLabel(user?.role)}</div>
              <div className="mt-0.5 text-[11px] uppercase tracking-[0.22em] text-sidebar-foreground/55">Workspace</div>
            </div>
          ) : null}
        </div>
        {!collapsed ? <OrganizationScopeSelector className="mt-3" /> : null}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Experience</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="rounded-full px-3 py-3 text-sidebar-foreground/78 transition-all duration-300 hover:bg-sidebar-background/90 hover:text-sidebar-foreground"
                      activeClassName="bg-sidebar-background text-sidebar-foreground shadow-[0_16px_34px_hsl(var(--shadow-color)/0.18)]"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(canModule("admin") || visibleAdminItems.length > 0) && (
          <SidebarGroup>
            <SidebarGroupLabel>Governance</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {canModule("admin") && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={DEFAULT_ADMIN_SECTION_PATH}
                          className="rounded-full px-3 py-3 text-sidebar-foreground/78 transition-all duration-300 hover:bg-sidebar-background/90 hover:text-sidebar-foreground"
                          activeClassName="bg-sidebar-background text-sidebar-foreground shadow-[0_16px_34px_hsl(var(--shadow-color)/0.18)]"
                        >
                          <Users className="mr-2 h-4 w-4" />
                          {!collapsed && <span>Admin</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    {!collapsed && adminSectionItems.length > 0 && (
                      <div className={cn("ml-5 mt-1 space-y-1 border-l border-sidebar-border/70 pl-3", !onAdminRoute && "opacity-90")}>
                        {adminSectionItems.map((item) => (
                          <NavLink
                            key={item.key}
                            to={item.path}
                            className="flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-medium text-sidebar-foreground/65 transition-all duration-300 hover:bg-sidebar-background/85 hover:text-sidebar-foreground"
                            activeClassName="bg-sidebar-background text-sidebar-foreground shadow-[0_12px_24px_hsl(var(--shadow-color)/0.14)]"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                            <span>{item.title}</span>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {visibleAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="rounded-full px-3 py-3 text-sidebar-foreground/78 transition-all duration-300 hover:bg-sidebar-background/90 hover:text-sidebar-foreground"
                      activeClassName="bg-sidebar-background text-sidebar-foreground shadow-[0_16px_34px_hsl(var(--shadow-color)/0.18)]"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && (
          <div className="theme-sidebar-footer rounded-2xl border border-sidebar-border/40 bg-sidebar-background/82 px-3 py-3 text-xs text-sidebar-foreground/70">
            <div className="flex items-center justify-between">
              <span>{activeTheme.environment.backgroundLabel}</span>
              <Compass className="h-3.5 w-3.5 text-sidebar-primary" />
            </div>
            <div className="mt-1 text-sidebar-foreground/50">{activeTheme.environment.imageryStyle}</div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
