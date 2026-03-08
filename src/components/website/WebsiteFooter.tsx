import { BarChart3 } from "lucide-react";
import { ExperienceVariantToggle } from "@/components/variants/ExperienceVariantToggle";
import { Link, useLocation } from "react-router-dom";

export function WebsiteFooter() {
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  function resolveHref(hash: string) {
    return isHomePage ? hash : `/${hash}`;
  }

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
                <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Operational Climate Intelligence</div>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Enterprise-grade emissions analytics, strategy orchestration, and portfolio reporting in one atmospheric workspace.
            </p>
            <div className="mt-5">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Experience version</div>
              <ExperienceVariantToggle size="sm" />
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Platform</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><a href={resolveHref("#experience")} className="transition-colors hover:text-foreground">Experience</a></li>
              <li><a href={resolveHref("#capabilities")} className="transition-colors hover:text-foreground">Capabilities</a></li>
              <li><a href="/login" className="transition-colors hover:text-foreground">Access Portal</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Company</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><a href={resolveHref("#contact")} className="transition-colors hover:text-foreground">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Assurance</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><Link to="/assurance" className="transition-colors hover:text-foreground">Assurance Overview</Link></li>
              <li><Link to="/privacy" className="transition-colors hover:text-foreground">Privacy</Link></li>
              <li><Link to="/security" className="transition-colors hover:text-foreground">Security</Link></li>
              <li><Link to="/compliance" className="transition-colors hover:text-foreground">Compliance</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-2 border-t border-border/60 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">© 2026 EnergyOS. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <a href="#" className="transition-colors hover:text-foreground">LinkedIn</a>
            <a href="#" className="transition-colors hover:text-foreground">X</a>
            <a href="#" className="transition-colors hover:text-foreground">Contact Desk</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
