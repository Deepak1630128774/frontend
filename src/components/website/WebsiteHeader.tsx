import { Link, useLocation } from "react-router-dom";
import { BarChart3, ChevronRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ThemeModeToggle, ThemeSelector } from "@/components/theme/ThemeControls";

const navLinks = [
  { label: "Experience", href: "#experience" },
  { label: "Capabilities", href: "#capabilities" },
  { label: "Contact", href: "#contact" },
];

export function WebsiteHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  function resolveHref(hash: string) {
    return isHomePage ? hash : `/${hash}`;
  }

  return (
    <header className="theme-header-surface fixed left-0 right-0 top-0 z-50 border-b border-border/50 backdrop-blur-xl">
      <div className="theme-wide-shell mx-auto flex h-20 items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/35 bg-primary/10 text-primary shadow-[0_8px_24px_hsl(var(--primary)/0.16)]">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold uppercase tracking-[0.24em] text-primary">EnergyOS</div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Climate Intelligence</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((l) => (
            <a
              key={l.label}
              href={resolveHref(l.href)}
              className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-primary"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <ThemeSelector />
          <ThemeModeToggle />
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">Sign In</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/login">
              Enter Platform
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeSelector compact />
          <ThemeModeToggle compact />
          <button className="text-foreground" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="space-y-3 border-b border-border bg-card px-4 pb-4 md:hidden">
          {navLinks.map((l) => (
            <a
              key={l.label}
              href={resolveHref(l.href)}
              className="block py-2 text-sm text-muted-foreground"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/login">Get Started</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
