import { useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Menu, X, Zap } from "lucide-react";

import { ThemeModeToggle, ThemeSelector } from "@/components/theme/ThemeControls";
import { ExperienceVariantToggle } from "@/components/variants/ExperienceVariantToggle";
import { Button } from "@/components/ui/button";

type AuthenticatedWebsiteChromeProps = {
  workspaceName: string;
  roleText: string;
  canAdmin: boolean;
  onLogout: () => void;
};

function WorkspaceLinks({ canAdmin, onNavigate }: { canAdmin: boolean; onNavigate?: () => void }) {
  const links = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "CO2", href: "/co2" },
    { label: "Fuel & Energy", href: "/fuel-energy" },
    { label: canAdmin ? "Admin" : "Profile", href: canAdmin ? "/admin" : "/profile" },
  ];

  return (
    <>
      {links.map((link) => (
        <Link key={link.href} to={link.href} onClick={onNavigate} className="transition-colors hover:text-foreground">
          {link.label}
        </Link>
      ))}
    </>
  );
}

export function CurrentAuthenticatedWebsiteHeader({ workspaceName, roleText, canAdmin, onLogout }: AuthenticatedWebsiteChromeProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="theme-header-surface fixed left-0 right-0 top-0 z-50 border-b border-border/50 backdrop-blur-xl">
      <div className="theme-wide-shell mx-auto flex h-20 items-center justify-between px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/35 bg-primary/10 text-primary shadow-[0_8px_24px_hsl(var(--primary)/0.16)]">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold uppercase tracking-[0.24em] text-primary">EnergyOS</div>
            <div className="truncate text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{workspaceName} · {roleText}</div>
          </div>
        </div>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="#actions" className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-primary">Destinations</a>
          <a href="#recent" className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-primary">Recent work</a>
          <a href="#summary" className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-primary">Summary</a>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeSelector />
          <ThemeModeToggle />
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">Enter workspace</Link>
          </Button>
          <Button size="sm" onClick={onLogout}>Logout</Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeSelector compact />
          <ThemeModeToggle compact />
          <button type="button" className="text-foreground" onClick={() => setOpen((value) => !value)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="space-y-3 border-b border-border bg-card px-4 pb-4 md:hidden">
          <a href="#actions" className="block py-2 text-sm text-muted-foreground" onClick={() => setOpen(false)}>Destinations</a>
          <a href="#recent" className="block py-2 text-sm text-muted-foreground" onClick={() => setOpen(false)}>Recent work</a>
          <a href="#summary" className="block py-2 text-sm text-muted-foreground" onClick={() => setOpen(false)}>Summary</a>
          <div className="grid gap-2 pt-2 text-sm text-muted-foreground">
            <WorkspaceLinks canAdmin={canAdmin} onNavigate={() => setOpen(false)} />
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard" onClick={() => setOpen(false)}>Enter workspace</Link>
            </Button>
            <Button size="sm" onClick={onLogout}>Logout</Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function CurrentAuthenticatedWebsiteFooter({ workspaceName, canAdmin }: Omit<AuthenticatedWebsiteChromeProps, "roleText" | "onLogout">) {
  return (
    <footer className="theme-footer-surface border-t border-primary/10">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-primary/35 bg-primary/10 text-primary">
                <BarChart3 className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">EnergyOS</div>
                <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Authenticated Workspace Gateway</div>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Structured access into {workspaceName}, with recent work, live summaries, and direct routes into the operational modules.
            </p>
            <div className="mt-5">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Experience version</div>
              <ExperienceVariantToggle size="sm" />
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Gateway</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><a href="#actions" className="transition-colors hover:text-foreground">Destinations</a></li>
              <li><a href="#recent" className="transition-colors hover:text-foreground">Recent Work</a></li>
              <li><a href="#summary" className="transition-colors hover:text-foreground">Summary</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Workspace</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><Link to="/dashboard" className="transition-colors hover:text-foreground">Dashboard</Link></li>
              <li><Link to="/co2" className="transition-colors hover:text-foreground">CO2</Link></li>
              <li><Link to="/fuel-energy" className="transition-colors hover:text-foreground">Fuel & Energy</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Account</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              {canAdmin ? <li><Link to="/admin" className="transition-colors hover:text-foreground">Admin</Link></li> : null}
              <li><Link to="/profile" className="transition-colors hover:text-foreground">Profile</Link></li>
              <li><Link to="/privacy" className="transition-colors hover:text-foreground">Privacy</Link></li>
              <li><Link to="/security" className="transition-colors hover:text-foreground">Security</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-2 border-t border-border/60 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">© 2026 EnergyOS. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/assurance" className="transition-colors hover:text-foreground">Assurance</Link>
            <Link to="/compliance" className="transition-colors hover:text-foreground">Compliance</Link>
            <Link to="/profile" className="transition-colors hover:text-foreground">Account Center</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function EditorialAuthenticatedWebsiteHeader({ workspaceName, roleText, canAdmin, onLogout }: AuthenticatedWebsiteChromeProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-12">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_12px_36px_hsl(var(--primary)/0.24)]">
          <Zap className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-foreground">EnergyOS</div>
          <div className="truncate text-[10px] uppercase tracking-[0.28em] text-muted-foreground">{workspaceName} · {roleText}</div>
        </div>
      </div>

      <nav className="hidden items-center gap-8 md:flex">
        <a href="#actions" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Destinations</a>
        <a href="#recent" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Recent work</a>
        <a href="#summary" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Summary</a>
      </nav>

      <div className="hidden items-center gap-3 md:flex">
        <ThemeSelector compact />
        <ThemeModeToggle compact />
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard">Enter workspace</Link>
        </Button>
        <Button size="sm" className="rounded-full px-5" onClick={onLogout}>Logout</Button>
      </div>

      <button type="button" className="rounded-xl border border-border/60 bg-card/70 p-2 md:hidden" onClick={() => setOpen((value) => !value)}>
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open ? (
        <div className="absolute left-6 right-6 top-full mt-3 rounded-2xl border border-border/60 bg-card/95 p-4 shadow-[0_24px_80px_hsl(var(--shadow-color)/0.18)] backdrop-blur-xl md:hidden">
          <div className="space-y-2">
            <a href="#actions" className="block rounded-xl px-3 py-2 text-sm text-muted-foreground" onClick={() => setOpen(false)}>Destinations</a>
            <a href="#recent" className="block rounded-xl px-3 py-2 text-sm text-muted-foreground" onClick={() => setOpen(false)}>Recent work</a>
            <a href="#summary" className="block rounded-xl px-3 py-2 text-sm text-muted-foreground" onClick={() => setOpen(false)}>Summary</a>
          </div>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <WorkspaceLinks canAdmin={canAdmin} onNavigate={() => setOpen(false)} />
          </div>
          <div className="mt-3 grid gap-2">
            <div className="flex items-center justify-center gap-2 pb-1">
              <ThemeSelector compact />
              <ThemeModeToggle compact />
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard" onClick={() => setOpen(false)}>Enter workspace</Link>
            </Button>
            <Button size="sm" onClick={onLogout}>Logout</Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function EditorialAuthenticatedWebsiteFooter({ workspaceName, canAdmin }: Omit<AuthenticatedWebsiteChromeProps, "roleText" | "onLogout">) {
  return (
    <footer className="relative z-10 border-t border-border/50 py-10 text-sm text-muted-foreground">
      <div className="mx-auto grid max-w-5xl gap-8 px-6 lg:grid-cols-[1.4fr_0.8fr_1fr] lg:px-12">
        <div className="space-y-4 text-center lg:text-left">
          <div className="flex items-center justify-center gap-3 lg:justify-start">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BarChart3 className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground">EnergyOS</span>
          </div>
          <p className="max-w-2xl leading-7">A classic canvas-style authenticated gateway for {workspaceName}, with direct routes into planning, analytics, and governance.</p>
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Experience version</div>
            <ExperienceVariantToggle size="sm" />
          </div>
        </div>

        <div className="text-center lg:text-left">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Gateway</h4>
          <ul className="space-y-2 text-xs">
            <li><a href="#actions" className="transition-colors hover:text-foreground">Destinations</a></li>
            <li><a href="#recent" className="transition-colors hover:text-foreground">Recent work</a></li>
            <li><a href="#summary" className="transition-colors hover:text-foreground">Summary</a></li>
          </ul>
        </div>

        <div className="text-center lg:text-left">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Shortcuts</h4>
          <ul className="space-y-2 text-xs">
            <li><Link to="/dashboard" className="transition-colors hover:text-foreground">Dashboard</Link></li>
            <li><Link to="/co2" className="transition-colors hover:text-foreground">CO2</Link></li>
            <li><Link to="/fuel-energy" className="transition-colors hover:text-foreground">Fuel & Energy</Link></li>
            {canAdmin ? <li><Link to="/admin" className="transition-colors hover:text-foreground">Admin</Link></li> : null}
            <li><Link to="/profile" className="transition-colors hover:text-foreground">Profile</Link></li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-5xl border-t border-border/50 px-6 pt-6 text-center lg:px-12 lg:text-left">
        <p>© 2026 EnergyOS. All rights reserved.</p>
      </div>
    </footer>
  );
}