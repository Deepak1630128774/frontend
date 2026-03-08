import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  ShieldCheck,
  X,
} from "lucide-react";

import { useAuth } from "@/auth";
import { OrganizationScopeSelector } from "@/components/AppSidebar";
import { NavLink } from "@/components/NavLink";
import { ThemeModeToggle, ThemeSelector } from "@/components/theme/ThemeControls";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ADMIN_SECTION_ITEMS, DEFAULT_ADMIN_SECTION_PATH, getAdminSectionTitle } from "@/lib/admin-sections";
import { MAIN_NAV_ITEMS, UTILITY_NAV_ITEMS } from "@/lib/app-navigation";
import { getPlatformWorkspaceLabel, getWorkspaceDisplayName, isOrganizationWorkspaceContext } from "@/lib/tenant";
import { cn } from "@/lib/utils";
import { HeaderQuickActions } from "@/components/app-shell/HeaderQuickActions";

const pageDescriptions: Record<string, string> = {
  "/home": "A role-aware workspace home with live shortcuts, recent records, and summary widgets.",
  "/dashboard": "Executive sustainability and energy performance in one operating view.",
  "/co2": "Emissions analysis, trend inspection, and reporting workflows.",
  "/fuel-energy": "Fuel use, energy demand, and efficiency monitoring.",
  "/macc": "Abatement economics, ranking, and scenario evaluation.",
  "/strategies": "Initiatives, roadmaps, and target tracking across the portfolio.",
  "/profile": "Account identity, security, and workspace preferences.",
};

function SidebarSections({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const location = useLocation();
  const { canModule, user } = useAuth();
  const isElevatedUser = user?.role === "owner" || user?.role === "super_admin";

  const adminSectionItems = useMemo(
    () =>
      ADMIN_SECTION_ITEMS.filter((item) => {
        if (item.ownerOnly && !isElevatedUser) return false;
        if (item.requiresAssign && !canModule("admin", "assign")) return false;
        return canModule("admin");
      }),
    [canModule, isElevatedUser],
  );

  const visibleMainItems = MAIN_NAV_ITEMS.filter((item) => item.module === "dashboard" || canModule(item.module));
  const visibleUtilityItems = UTILITY_NAV_ITEMS.filter((item) => canModule(item.module));
  const onAdminRoute = location.pathname.startsWith("/admin");

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <div>
          {!collapsed ? <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-sidebar-foreground/55">Workspace</div> : null}
          <div className="space-y-1">
            {visibleMainItems.map((item) => (
              <NavLink
                key={item.url}
                to={item.url}
                end={item.url === "/dashboard"}
                onClick={onNavigate}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                activeClassName="bg-sidebar-accent text-sidebar-primary shadow-[0_14px_28px_hsl(var(--shadow-color)/0.28)]"
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed ? <span className="truncate">{item.title}</span> : null}
              </NavLink>
            ))}
          </div>
        </div>

        {(canModule("admin") || visibleUtilityItems.length > 0) ? (
          <div>
            {!collapsed ? <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-sidebar-foreground/55">Governance</div> : null}
            <div className="space-y-1">
              {canModule("admin") ? (
                <>
                  <NavLink
                    to={DEFAULT_ADMIN_SECTION_PATH}
                    onClick={onNavigate}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    activeClassName="bg-sidebar-accent text-sidebar-primary shadow-[0_14px_28px_hsl(var(--shadow-color)/0.28)]"
                  >
                    <ShieldCheck className="h-5 w-5 shrink-0" />
                    {!collapsed ? <span className="truncate">Admin</span> : null}
                  </NavLink>

                  {!collapsed && adminSectionItems.length > 0 ? (
                    <div className={cn("ml-6 mt-2 space-y-1 border-l border-sidebar-border/70 pl-4", !onAdminRoute && "opacity-90")}>
                      {adminSectionItems.map((item) => (
                        <NavLink
                          key={item.key}
                          to={item.path}
                          onClick={onNavigate}
                          className="block rounded-lg px-3 py-2 text-xs font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground"
                          activeClassName="bg-sidebar-accent/70 text-sidebar-primary"
                        >
                          {item.title}
                        </NavLink>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}

              {visibleUtilityItems.map((item) => (
                <NavLink
                  key={item.url}
                  to={item.url}
                  onClick={onNavigate}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  activeClassName="bg-sidebar-accent text-sidebar-primary shadow-[0_14px_28px_hsl(var(--shadow-color)/0.28)]"
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed ? <span className="truncate">{item.title}</span> : null}
                </NavLink>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function CommandAppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const pageTitle =
    getAdminSectionTitle(location.pathname) ??
    {
      "/home": "Workspace Home",
      "/dashboard": "Executive Overview",
      "/co2": "CO2 Emissions",
      "/fuel-energy": "Fuel & Energy",
      "/macc": "MACC",
      "/strategies": "Strategies",
      "/profile": "Profile",
    }[location.pathname] ??
    "Workspace";

  const pageDescription = location.pathname.startsWith("/admin")
    ? "Governance, approvals, invitations, and audit trails under the same backend workflows."
    : pageDescriptions[location.pathname] ?? "The presentation changed, but the routes and actions are the same.";

  const initials =
    user?.full_name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U";
  const platformWorkspaceLabel = getPlatformWorkspaceLabel(user?.role);
  const workspaceName = getWorkspaceDisplayName({
    role: user?.role,
    organizationName: user?.organization_name,
    organizationSlug: user?.organization_slug,
    tenantScope: user?.tenant_context?.scope,
  });
  const isOrganizationWorkspace = isOrganizationWorkspaceContext({
    organizationName: user?.organization_name,
    organizationSlug: user?.organization_slug,
    tenantScope: user?.tenant_context?.scope,
  });
  const workspaceLabel = isOrganizationWorkspace ? `${workspaceName} Workspace` : platformWorkspaceLabel;

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  useEffect(() => {
    document.title = isOrganizationWorkspace ? `${workspaceName} Workspace` : `${platformWorkspaceLabel} — Emissions Analytics`;
  }, [isOrganizationWorkspace, platformWorkspaceLabel, workspaceName]);

  return (
    <div data-app-variant-view="command" className="min-h-screen bg-background text-foreground lg:grid" style={{ gridTemplateColumns: collapsed ? "88px minmax(0,1fr)" : "280px minmax(0,1fr)" }}>
      <div className="hidden lg:flex lg:h-screen lg:flex-col lg:border-r lg:border-sidebar-border lg:bg-sidebar lg:shadow-[20px_0_60px_hsl(var(--shadow-color)/0.18)]">
        <div className="flex h-16 items-center gap-3 px-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_0_24px_hsl(var(--sidebar-primary)/0.18)]">
            <BarChart3 className="h-5 w-5" />
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-sidebar-accent-foreground">{workspaceLabel}</div>
            </div>
          ) : null}
        </div>

        <SidebarSections collapsed={collapsed} />

        <div className="border-t border-sidebar-border p-3">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/55"
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            {!collapsed ? <span>Collapse</span> : null}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/55"
          >
            <LogOut className="h-5 w-5" />
            {!collapsed ? <span>Sign Out</span> : null}
          </button>
        </div>
      </div>

      {mobileOpen ? <div className="fixed inset-0 z-40 bg-black/55 lg:hidden" onClick={() => setMobileOpen(false)} /> : null}

      <aside className={cn("fixed inset-y-0 left-0 z-50 w-[280px] border-r border-sidebar-border bg-sidebar shadow-[20px_0_60px_hsl(var(--shadow-color)/0.18)] transition-transform duration-300 lg:hidden", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex h-16 items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-sidebar-accent-foreground">{workspaceLabel}</div>
            </div>
          </div>
          <button type="button" className="rounded-xl p-2 text-sidebar-foreground" onClick={() => setMobileOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarSections collapsed={false} onNavigate={() => setMobileOpen(false)} />
      </aside>

      <main className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/88 backdrop-blur-xl">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 md:px-6 lg:px-8">
            <div className="flex min-w-0 items-start gap-3">
              <button
                type="button"
                className="rounded-xl border border-border/70 bg-card/75 p-2.5 text-foreground lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold tracking-[-0.03em] text-foreground">{pageTitle}</h1>
                <p className="hidden text-sm text-muted-foreground md:block">{pageDescription}</p>
                {isOrganizationWorkspace ? <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary">{workspaceLabel}</p> : null}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeSelector compact />
              <ThemeModeToggle compact />
              <HeaderQuickActions
                searchTriggerClassName="rounded-full border border-border/70 bg-card/75 px-4 py-2"
                searchLabelClassName="text-muted-foreground"
                iconButtonClassName="rounded-xl border border-border/70 bg-card/75"
                secondaryActionKind="settings"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full border border-primary/20 bg-primary/10">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">{initials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="flex flex-col">
                    <span className="font-semibold">{user?.full_name}</span>
                    <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>Profile</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="px-4 pb-3 md:px-6 lg:px-8">
            <OrganizationScopeSelector compact className="w-full sm:max-w-sm" />
          </div>
        </header>

        <div className="p-4 md:p-6 lg:p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-[calc(100vh-7rem)]"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
