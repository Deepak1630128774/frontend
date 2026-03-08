import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, Compass, Home, RefreshCcw, Search, Settings, ShieldCheck, User } from "lucide-react";

import { useAuth } from "@/auth";
import { ADMIN_SECTION_ITEMS, DEFAULT_ADMIN_SECTION_PATH } from "@/lib/admin-sections";
import { MAIN_NAV_ITEMS, UTILITY_NAV_ITEMS } from "@/lib/app-navigation";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type SecondaryActionKind = "settings" | "navigator";

type HeaderQuickActionsProps = {
  searchTriggerClassName?: string;
  searchLabelClassName?: string;
  iconButtonClassName?: string;
  secondaryActionKind: SecondaryActionKind;
};

type SearchEntry = {
  label: string;
  description: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
};

export function HeaderQuickActions({
  searchTriggerClassName,
  searchLabelClassName,
  iconButtonClassName,
  secondaryActionKind,
}: HeaderQuickActionsProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    canModule,
    requiresOrganizationSelection,
    hasOrganizationDataScope,
    selectedOrganizationName,
  } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  const moduleEntries = useMemo<SearchEntry[]>(() => {
    return MAIN_NAV_ITEMS.filter((item) => item.module === "dashboard" || canModule(item.module)).map((item) => ({
      label: item.title,
      description: `Open ${item.title}`,
      url: item.url,
      icon: item.icon,
      group: "Modules",
    }));
  }, [canModule]);

  const utilityEntries = useMemo<SearchEntry[]>(() => {
    return [
      {
        label: "Workspace home",
        description: "Return to the website-style home page",
        url: "/home",
        icon: Home,
        group: "Workspace",
      },
      ...UTILITY_NAV_ITEMS.filter((item) => canModule(item.module)).map((item) => ({
      label: item.title,
      description: `Open ${item.title}`,
      url: item.url,
      icon: item.icon,
      group: "Workspace",
      })),
    ];
  }, [canModule]);

  const adminEntries = useMemo<SearchEntry[]>(() => {
    if (!canModule("admin")) {
      return [];
    }

    const items = [
      {
        label: "Admin Workspace",
        description: "Open the admin control center",
        url: DEFAULT_ADMIN_SECTION_PATH,
        icon: ShieldCheck,
        group: "Governance",
      },
      ...ADMIN_SECTION_ITEMS.filter((item) => !item.ownerOnly || canModule("admin")).map((item) => ({
        label: item.title,
        description: item.description,
        url: item.path,
        icon: ShieldCheck,
        group: "Governance",
      })),
    ];

    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.url)) {
        return false;
      }
      seen.add(item.url);
      return true;
    });
  }, [canModule]);

  const groupedEntries = useMemo(() => {
    const grouped = new Map<string, SearchEntry[]>();
    for (const entry of [...moduleEntries, ...utilityEntries, ...adminEntries]) {
      const items = grouped.get(entry.group) ?? [];
      items.push(entry);
      grouped.set(entry.group, items);
    }
    return grouped;
  }, [adminEntries, moduleEntries, utilityEntries]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((current) => !current);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function openUrl(url: string) {
    setSearchOpen(false);
    if (location.pathname === url) {
      window.location.reload();
      return;
    }
    navigate(url);
  }

  const notificationItems = [
    requiresOrganizationSelection && !hasOrganizationDataScope
      ? {
          label: "Choose a workspace scope",
          description: "Organization data is hidden until you select a scope.",
          action: () => navigate(DEFAULT_ADMIN_SECTION_PATH),
        }
      : null,
    selectedOrganizationName
      ? {
          label: `Working in ${selectedOrganizationName}`,
          description: "Your data requests are scoped to the selected organization.",
          action: () => navigate("/dashboard"),
        }
      : null,
    canModule("admin")
      ? {
          label: "Review governance activity",
          description: "Open the admin workspace to review approvals and audits.",
          action: () => navigate(DEFAULT_ADMIN_SECTION_PATH),
        }
      : null,
    {
      label: "Open profile settings",
      description: "Review your account preferences and security settings.",
      action: () => navigate("/profile"),
    },
  ].filter(Boolean) as Array<{ label: string; description: string; action: () => void }>;

  const secondaryLabel = secondaryActionKind === "settings" ? "Settings" : "Navigator";
  const SecondaryIcon = secondaryActionKind === "settings" ? Settings : Compass;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className={cn("hidden items-center gap-2 lg:flex", searchTriggerClassName)}
        onClick={() => setSearchOpen(true)}
      >
        <Search className="h-3.5 w-3.5 text-primary" />
        <span className={cn("text-xs text-muted-foreground", searchLabelClassName)}>Search projects, sites, and scenarios</span>
        <CommandShortcut>Ctrl K</CommandShortcut>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className={iconButtonClassName} aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notificationItems.map((item) => (
            <DropdownMenuItem key={item.label} className="items-start py-3" onClick={item.action}>
              <div className="space-y-1">
                <div className="font-medium text-foreground">{item.label}</div>
                <div className="text-xs leading-5 text-muted-foreground">{item.description}</div>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className={iconButtonClassName} aria-label={secondaryLabel}>
            <SecondaryIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>{secondaryLabel}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/home")}>
            <Home className="mr-2 h-4 w-4" />
            Workspace home
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/dashboard")}>
            <Search className="mr-2 h-4 w-4" />
            Open dashboard
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/profile")}>
            <User className="mr-2 h-4 w-4" />
            Profile settings
          </DropdownMenuItem>
          {canModule("admin") ? (
            <DropdownMenuItem onClick={() => navigate(DEFAULT_ADMIN_SECTION_PATH)}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Admin workspace
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onClick={() => window.location.reload()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh current page
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search modules, pages, and governance tools..." />
        <CommandList>
          <CommandEmpty>No matching workspace destinations.</CommandEmpty>
          {Array.from(groupedEntries.entries()).map(([group, entries], index) => (
            <div key={group}>
              {index > 0 ? <CommandSeparator /> : null}
              <CommandGroup heading={group}>
                {entries.map((entry) => (
                  <CommandItem key={entry.url} value={`${entry.label} ${entry.description}`} onSelect={() => openUrl(entry.url)}>
                    <entry.icon className="mr-2 h-4 w-4" />
                    <div className="flex flex-col gap-0.5">
                      <span>{entry.label}</span>
                      <span className="text-xs text-muted-foreground">{entry.description}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}