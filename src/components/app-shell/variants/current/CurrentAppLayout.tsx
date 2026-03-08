import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar, OrganizationScopeSelector } from "@/components/AppSidebar";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getAdminSectionTitle } from "@/lib/admin-sections";
import { MAIN_NAV_ITEMS, UTILITY_NAV_ITEMS } from "@/lib/app-navigation";
import { useAuth } from "@/auth";
import { useLocation, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeModeToggle, ThemeSelector } from "@/components/theme/ThemeControls";
import { motion } from "framer-motion";
import { NavLink } from "@/components/NavLink";
import { ThemeExperienceBackdrop } from "@/components/theme/ThemeExperienceLayer";
import { useThemeSystem } from "@/components/theme/ThemeProvider";
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

export default function CurrentAppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { canModule } = useAuth();
  const { activeTheme } = useThemeSystem();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = user?.full_name
    .split(" ")
    .map((n) => n[0])
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
    }[location.pathname] ?? "Workspace";
  const pageDescription = location.pathname.startsWith("/admin")
    ? "Governance, approvals, invitations, and audit trails under the same backend workflows."
    : pageDescriptions[location.pathname] ?? "The presentation changed, but the routes and actions are the same.";

  useEffect(() => {
    document.title = isOrganizationWorkspace ? `${workspaceName} Workspace` : `${platformWorkspaceLabel} — Emissions Analytics`;
  }, [isOrganizationWorkspace, platformWorkspaceLabel, workspaceName]);

  const visibleMainItems = MAIN_NAV_ITEMS.filter((item) => item.module === "dashboard" || canModule(item.module));
  const visibleUtilityItems = UTILITY_NAV_ITEMS.filter((item) => canModule(item.module));
  const showTopNavigation = activeTheme.layout.nav !== "sidebar";
  const sidebarProviderStyle = {
    "--sidebar-width": "var(--experience-sidebar-width-fluid)",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarProviderStyle as any}>
      <div data-app-variant-view="current" className="theme-experience-root relative min-h-screen w-full max-w-full overflow-hidden">
        <ThemeExperienceBackdrop />
        <div className="theme-layout-frame museum-grid theme-shell relative z-10 flex min-h-screen w-full max-w-full px-[var(--experience-shell-padding)] pb-[var(--experience-shell-padding)] pt-[var(--experience-shell-padding)]">
          <div className={cn("theme-sidebar-column hidden lg:block", activeTheme.layout.nav === "topbar" && "2xl:block")}>
            <AppSidebar />
          </div>

          <div className="flex min-w-0 flex-1 flex-col" style={{ gap: "var(--experience-shell-gap-fluid)" }}>
            <header className="theme-header-surface theme-layout-header sticky top-[var(--experience-shell-padding)] z-30 border border-border/50 px-[var(--experience-main-padding)] py-[calc(var(--experience-main-padding)*0.72)] backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <SidebarTrigger className="theme-topbar-action h-10 w-10 rounded-full border" />
                  <div className={cn("min-w-0", activeTheme.layout.heroAlign === "center" && "md:text-center")}>
                      <h1 className="truncate text-2xl font-semibold tracking-[-0.03em] text-foreground">{pageTitle}</h1>
                      <div className="mt-1 max-w-2xl text-sm text-muted-foreground">{pageDescription}</div>
                      {isOrganizationWorkspace ? <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{workspaceLabel}</div> : null}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ThemeSelector compact />
                  <ThemeModeToggle compact />
                  <HeaderQuickActions
                    searchTriggerClassName="theme-topbar-chip"
                    iconButtonClassName="theme-topbar-action text-foreground"
                    secondaryActionKind="navigator"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full border border-primary/20 bg-primary/10">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel className="flex flex-col">
                        <span className="font-semibold">{user?.full_name}</span>
                        <span className="font-normal text-xs text-muted-foreground">{user?.email}</span>
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

              <OrganizationScopeSelector compact className="mt-4 w-full sm:max-w-sm" />

              {showTopNavigation ? (
                <div className="theme-nav-ribbon mt-4 flex flex-wrap items-center gap-2">
                  {visibleMainItems.map((item) => (
                    <NavLink
                      key={item.title}
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="theme-nav-chip flex items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground transition-all duration-300 hover:text-foreground"
                      activeClassName="bg-primary text-primary-foreground shadow-[0_18px_40px_hsl(var(--primary)/0.26)]"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  ))}
                  {visibleUtilityItems.map((item) => (
                    <NavLink
                      key={item.title}
                      to={item.url}
                      className="theme-nav-chip theme-nav-chip-secondary flex items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground transition-all duration-300 hover:text-foreground"
                      activeClassName="bg-primary/14 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.25)]"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  ))}
                </div>
              ) : null}
            </header>

            <div className="theme-workbench flex min-h-0 flex-1">
              <main className="theme-main-stage min-w-0 flex-1 overflow-x-hidden overflow-y-auto border border-border/40 bg-background/50 px-[var(--experience-main-padding)] py-[var(--experience-main-padding)] backdrop-blur-sm">
                <motion.div
                  key={location.pathname}
                  className="min-w-0 w-full"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: activeTheme.motion.durationMs / 1000, ease: [0.22, 1, 0.36, 1] }}
                >
                  {children}
                </motion.div>
              </main>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
