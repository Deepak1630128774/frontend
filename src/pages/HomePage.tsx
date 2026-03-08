import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Clock3,
  Database,
  Flame,
  Home,
  Lightbulb,
  Shield,
  ShieldCheck,
  TrendingDown,
  User,
  Waves,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "@/api/client";
import { useAuth } from "@/auth";
import {
  CurrentAuthenticatedWebsiteFooter,
  CurrentAuthenticatedWebsiteHeader,
  EditorialAuthenticatedWebsiteFooter,
  EditorialAuthenticatedWebsiteHeader,
} from "@/components/website/AuthenticatedWebsiteChrome";
import { useWebsiteVariantSystem } from "@/components/website/WebsiteVariantProvider";
import { EmptyState, PageLoadingState } from "@/components/state-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlatformWorkspaceLabel, getWorkspaceDisplayName } from "@/lib/tenant";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

type HomeAction = {
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: React.ComponentType<{ className?: string }>;
  tintClassName: string;
};

interface SavedProjectsOverviewResponse {
  co2_projects: Array<{
    project_code: string;
    organization: string;
    project_name: string;
    target_year?: string | number;
    status?: string | null;
    updated_at?: string | null;
  }>;
  fuel_calculations: Array<{
    unique_code: string;
    org_name: string;
    sector?: string | null;
    target_year?: string | number;
    updated_at?: string | null;
  }>;
  macc_projects: Array<{
    id: string;
    organization: string;
    project_name: string;
    target_year?: string | number;
    mac?: number | null;
    total_co2_diff?: number | null;
    created_at?: string | null;
  }>;
  strategy_portfolios: Array<{
    id: string;
    name: string;
    organization: string;
    sector?: string | null;
    baseline_calc_id?: string | null;
    updated_at?: string | null;
  }>;
}

interface AuditRow {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
}

type RecordType = "co2" | "fuel" | "macc" | "strategy";

type HomeRecord = {
  id: string;
  type: RecordType;
  title: string;
  organization: string;
  detail: string;
  updatedAt: string | null;
  href: string;
};

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value: string | null | undefined): string {
  const parsed = toDate(value);
  if (!parsed) return "No recent update";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function roleLabel(role?: string | null): string {
  return String(role || "user").replace(/_/g, " ");
}

function moduleLabel(type: RecordType): string {
  if (type === "co2") return "CO2";
  if (type === "fuel") return "Fuel";
  if (type === "macc") return "MACC";
  return "Strategy";
}

type AnalyticsCard = {
  label: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
};

type HomeViewModel = {
  workspaceName: string;
  roleText: string;
  userName: string;
  email: string;
  isAdminUser: boolean;
  analyticsCards: AnalyticsCard[];
  mainActions: HomeAction[];
  secondaryLinks: Array<{ label: string; href: string; icon: React.ComponentType<{ className?: string }> }>;
  recentRecords: HomeRecord[];
  moduleCounts: Record<RecordType, number>;
  canAdmin: boolean;
  onLogout: () => void;
};

function CurrentHomeGateway({ view }: { view: HomeViewModel }) {
  return (
    <div data-home-variant-view="current" className="min-h-screen bg-background text-foreground">
      <CurrentAuthenticatedWebsiteHeader
        workspaceName={view.workspaceName}
        roleText={view.roleText}
        canAdmin={view.canAdmin}
        onLogout={view.onLogout}
      />

      <section className="relative min-h-screen overflow-hidden pt-24">
        <div className="museum-grid absolute inset-0 opacity-30" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_34%),radial-gradient(circle_at_top_right,hsl(var(--accent)/0.16),transparent_28%)]" />

        <div className="theme-wide-shell relative mx-auto flex min-h-[calc(100vh-6rem)] flex-col justify-between px-4 pb-12 sm:px-6 lg:px-8">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="theme-reading-hero pt-20 md:pt-28">
            <div className="gold-kicker">Authenticated Workspace Gateway</div>
            <h1 className="theme-hero-text theme-reading-hero headline-balance mt-8 text-5xl font-semibold leading-[0.96] md:text-7xl">
              {view.workspaceName}
            </h1>
            <p className="theme-hero-copy theme-reading-xl mt-6 max-w-3xl text-base leading-8 md:text-lg">
              Start from a clear view of your active records, module activity, and latest updates, then move directly into the part of the workspace that needs attention now.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button size="lg" asChild>
                <Link to={view.mainActions[0]?.href ?? "/dashboard"}>
                  {view.mainActions[0]?.cta ?? "Open dashboard"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#recent">Continue recent work</a>
              </Button>
            </div>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2} className="mt-16 grid gap-4 md:grid-cols-[0.8fr_1.2fr_1fr_1fr]">
            {view.analyticsCards.map((card) => (
              <div key={card.label} className="section-frame p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
                    <card.icon className="h-4 w-4" />
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-primary">{card.label}</div>
                </div>
                <div className="mt-4 text-3xl font-semibold text-foreground">{card.value}</div>
                <div className="theme-hero-copy mt-2 text-sm leading-6">{card.detail}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="actions" className="theme-section-band border-y border-primary/10">
        <div className="theme-wide-shell mx-auto px-4 py-24 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeUp} custom={0} className="theme-reading-center mx-auto text-center">
            <div className="gold-kicker">Primary destinations</div>
            <h2 className="theme-hero-text mt-6 text-4xl font-semibold md:text-5xl">Choose the next workspace section</h2>
            <p className="theme-hero-copy mt-5 text-base leading-8">The four main entry points below stay prominent, but the copy adapts to your current role.</p>
          </motion.div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {view.mainActions.map((action, index) => (
              <motion.div key={action.title} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeUp} custom={index}>
                <Card className="h-full bg-card/74">
                  <CardContent className="p-6">
                    <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/35 bg-gradient-to-br text-primary", action.tintClassName)}>
                      <action.icon className="h-5 w-5" />
                    </div>
                    <h3 className="theme-hero-text mt-5 text-[1.9rem] font-semibold">{action.title}</h3>
                    <p className="theme-hero-copy mt-3 text-sm leading-7">{action.description}</p>
                    <Button asChild className="mt-6 w-full justify-between">
                      <Link to={action.href}>
                        {action.cta}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="recent" className="theme-wide-shell mx-auto px-4 py-24 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeUp} custom={0}>
            <div className="gold-kicker">Recent work</div>
            <h2 className="theme-reading-lg headline-balance mt-6 text-4xl font-semibold text-foreground md:text-5xl">Resume the latest saved records</h2>
            <div className="mt-8 grid gap-4">
              {view.recentRecords.length ? view.recentRecords.map((record, index) => (
                <motion.div key={`${record.type}-${record.id}`} variants={fadeUp} custom={index + 1} className="section-frame p-5">
                  <Link to={record.href} className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{moduleLabel(record.type)}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(record.updatedAt)}</span>
                      </div>
                      <h3 className="mt-3 text-2xl font-semibold text-foreground">{record.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{record.organization} · {record.detail}</p>
                    </div>
                    <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-primary" />
                  </Link>
                </motion.div>
              )) : (
                <div className="section-frame p-5 text-sm leading-7 text-muted-foreground">
                  No saved projects are available in the current scope yet. Use one of the main destinations above to start creating workspace data.
                </div>
              )}
            </div>
          </motion.div>

          <motion.div id="summary" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeUp} custom={1} className="image-panel min-h-[32rem] overflow-hidden">
            <div className="relative h-full p-8">
              <div className="gold-kicker">Workspace summary</div>
              <div className="mt-5 space-y-6">
                <div>
                  <div className="text-sm text-muted-foreground">Signed in as</div>
                  <div className="mt-1 text-3xl font-semibold text-foreground">{view.userName}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{view.email}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Role</div>
                  <div className="mt-1 text-2xl font-semibold capitalize text-foreground">{view.roleText}</div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="section-frame p-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-primary">CO2</div>
                    <div className="mt-2 text-2xl font-semibold">{view.moduleCounts.co2}</div>
                  </div>
                  <div className="section-frame p-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-primary">Fuel</div>
                    <div className="mt-2 text-2xl font-semibold">{view.moduleCounts.fuel}</div>
                  </div>
                  <div className="section-frame p-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-primary">MACC</div>
                    <div className="mt-2 text-2xl font-semibold">{view.moduleCounts.macc}</div>
                  </div>
                  <div className="section-frame p-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-primary">Strategy</div>
                    <div className="mt-2 text-2xl font-semibold">{view.moduleCounts.strategy}</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative overflow-hidden">
        <div className="theme-wide-shell relative mx-auto px-4 py-20 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2} className="section-frame p-8 text-center md:p-12">
            <div className="gold-kicker mx-auto">Quick access</div>
            <h2 className="mt-6 text-4xl font-semibold text-foreground md:text-5xl">Supporting areas stay one click away</h2>
            <p className="theme-reading-center mx-auto mt-5 max-w-3xl text-base leading-8 text-muted-foreground">
              Use these secondary links for the supporting pages that should still feel available from the website-style gateway.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              {view.secondaryLinks.map((link) => (
                <Button key={link.href} size="lg" variant="outline" asChild>
                  <Link to={link.href}>
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                </Button>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <CurrentAuthenticatedWebsiteFooter workspaceName={view.workspaceName} canAdmin={view.canAdmin} />
    </div>
  );
}

function FloatingShape({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -30, 0], scale: [1, 1.08, 1] }}
      transition={{ duration: 6, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

function EditorialHomeGateway({ view }: { view: HomeViewModel }) {
  return (
    <div data-home-variant-view="editorial" className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <FloatingShape className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-primary/18 blur-3xl" delay={0} />
      <FloatingShape className="absolute -left-20 top-1/3 h-72 w-72 rounded-full bg-chart-3/20 blur-3xl" delay={2} />
      <FloatingShape className="absolute bottom-20 right-1/4 h-80 w-80 rounded-full bg-chart-2/16 blur-3xl" delay={4} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.08),transparent_50%)]" />

      <EditorialAuthenticatedWebsiteHeader
        workspaceName={view.workspaceName}
        roleText={view.roleText}
        canAdmin={view.canAdmin}
        onLogout={view.onLogout}
      />

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-10 lg:px-12 lg:pt-16">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <span className="mb-6 inline-flex rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-foreground">
              Authenticated Workspace Gateway
            </span>
          </motion.div>

          <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1} className="text-5xl font-semibold tracking-tight md:text-7xl lg:text-8xl lg:leading-[0.95]">
            {view.workspaceName}
            <br />
            <span className="text-primary">ready to operate.</span>
          </motion.h1>

          <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2} className="mx-auto mt-8 max-w-3xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            A website-style welcome page after login for the classic canvas experience. It keeps the same gateway purpose, but matches the public editorial presentation more closely.
          </motion.p>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Button size="lg" className="rounded-full px-8 py-6 text-base" asChild>
              <Link to={view.mainActions[0]?.href ?? "/dashboard"}>
                {view.mainActions[0]?.cta ?? "Open dashboard"}
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-8 py-6 text-base" asChild>
              <a href="#recent">Continue recent work</a>
            </Button>
          </motion.div>
        </div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4} className="mx-auto mt-20 max-w-6xl">
          <div className="glass-card rounded-[2rem] p-6 md:p-8">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {view.analyticsCards.map((card) => (
                <div key={card.label} className="rounded-2xl bg-sidebar-accent/30 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <card.icon className="h-5 w-5 text-foreground" />
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/70">{card.label}</div>
                  </div>
                  <div className="mt-4 text-2xl font-semibold">{card.value}</div>
                  <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      <section id="actions" className="relative z-10 mx-auto max-w-7xl px-6 py-16 lg:px-12">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-16 text-center">
          <h2 className="text-4xl font-semibold md:text-5xl">
            Four core <span className="text-primary">destinations</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">The primary entry points below stay fixed while the messaging adjusts to the user role.</p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {view.mainActions.map((action, index) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.45 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="glass-card rounded-2xl p-8"
            >
              <div className={cn("mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-foreground", action.tintClassName)}>
                <action.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{action.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{action.description}</p>
              <Button size="sm" className="mt-6 rounded-full px-5" asChild>
                <Link to={action.href}>
                  {action.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="recent" className="relative z-10 mx-auto max-w-7xl px-6 py-16 lg:px-12">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="glass-card rounded-[2rem] p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Recent work</div>
                <h2 className="mt-2 text-3xl font-semibold">Continue the latest saved records</h2>
              </div>
              <Waves className="h-6 w-6 text-primary" />
            </div>

            <div className="space-y-3">
              {view.recentRecords.length ? view.recentRecords.map((record) => (
                <Link key={`${record.type}-${record.id}`} to={record.href} className="block rounded-2xl border border-border/50 bg-card/40 p-5 transition hover:border-primary/30 hover:bg-card/70">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground">{moduleLabel(record.type)}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(record.updatedAt)}</span>
                      </div>
                      <div className="mt-3 text-lg font-semibold">{record.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{record.organization} · {record.detail}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
                  </div>
                </Link>
              )) : (
                <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-5 text-sm leading-7 text-muted-foreground">
                  No saved projects are available in the current scope yet. Use one of the main destinations above to start creating workspace data.
                </div>
              )}
            </div>
          </div>

          <div id="summary" className="glass-card rounded-[2rem] p-8">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Workspace summary</div>
            <h2 className="mt-2 text-3xl font-semibold">Current scope at a glance</h2>
            <div className="mt-8 space-y-6">
              <div>
                <div className="text-sm text-muted-foreground">Signed in as</div>
                <div className="mt-1 text-2xl font-semibold">{view.userName}</div>
                <div className="mt-1 text-sm text-muted-foreground">{view.email}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Role</div>
                <div className="mt-1 text-2xl font-semibold capitalize">{view.roleText}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ["CO2", view.moduleCounts.co2],
                  ["Fuel", view.moduleCounts.fuel],
                  ["MACC", view.moduleCounts.macc],
                  ["Strategy", view.moduleCounts.strategy],
                ] as Array<[string, number]>).map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-card/35 p-4">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
                    <div className="mt-2 text-2xl font-semibold">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-4xl px-6 py-20 text-center lg:px-12">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass-card relative overflow-hidden rounded-[2rem] p-12 md:p-16">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/6 to-transparent" />
          <div className="relative">
            <h2 className="mb-4 text-3xl font-semibold md:text-4xl">Supporting pages stay close</h2>
            <p className="mx-auto mb-8 max-w-2xl text-muted-foreground">
              These links keep the rest of the workspace accessible while the main four destinations remain the primary decision points.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {view.secondaryLinks.map((link) => (
                <Button key={link.href} size="lg" variant="outline" className="rounded-full px-6" asChild>
                  <Link to={link.href}>
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      <EditorialAuthenticatedWebsiteFooter workspaceName={view.workspaceName} canAdmin={view.canAdmin} />
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { token, user, logout, canModule, hasOrganizationDataScope, requiresOrganizationSelection, selectedOrganizationName } = useAuth();
  const { activeWebsiteVariant } = useWebsiteVariantSystem();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<SavedProjectsOverviewResponse | null>(null);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);

  const workspaceName = getWorkspaceDisplayName({
    role: user?.role,
    organizationName: user?.selected_organization_name || user?.effective_organization_name || user?.organization_name,
    organizationSlug: user?.selected_organization_slug || user?.effective_organization_slug || user?.organization_slug,
    tenantScope: user?.tenant_context?.scope,
  });

  const isAdminUser = user?.role === "owner" || user?.role === "super_admin" || user?.role === "buyer_admin" || user?.role === "org_admin";

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    if (requiresOrganizationSelection && !hasOrganizationDataScope) {
      setOverview(null);
      setAuditRows([]);
      setError("");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    void Promise.allSettled([
      api.get<SavedProjectsOverviewResponse>("/api/admin/saved-projects-overview", token),
      api.get<AuditRow[]>("/api/admin/audit?limit=6", token),
    ]).then(([overviewResult, auditResult]) => {
      if (cancelled) return;

      if (overviewResult.status === "fulfilled") {
        setOverview(overviewResult.value ?? null);
      } else {
        setOverview(null);
        setError(overviewResult.reason instanceof Error ? overviewResult.reason.message : "Unable to load workspace overview");
      }

      if (auditResult.status === "fulfilled") {
        setAuditRows(auditResult.value ?? []);
      } else {
        setAuditRows([]);
      }

      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [hasOrganizationDataScope, requiresOrganizationSelection, token, user?.role]);

  const records = useMemo<HomeRecord[]>(() => {
    if (!overview) return [];

    return [
      ...overview.co2_projects.map((row) => ({
        id: row.project_code,
        type: "co2" as const,
        title: row.project_name || row.project_code,
        organization: row.organization || selectedOrganizationName || user?.organization_name || "Organization workspace",
        detail: row.target_year ? `Target year ${row.target_year}` : "CO2 project",
        updatedAt: row.updated_at ?? null,
        href: "/co2",
      })),
      ...overview.fuel_calculations.map((row) => ({
        id: row.unique_code,
        type: "fuel" as const,
        title: row.unique_code,
        organization: row.org_name || selectedOrganizationName || user?.organization_name || "Organization workspace",
        detail: row.sector?.trim() || "Fuel calculation",
        updatedAt: row.updated_at ?? null,
        href: "/fuel-energy",
      })),
      ...overview.macc_projects.map((row) => ({
        id: row.id,
        type: "macc" as const,
        title: row.project_name || row.id,
        organization: row.organization || selectedOrganizationName || user?.organization_name || "Organization workspace",
        detail: typeof row.mac === "number" ? `MAC ${row.mac.toFixed(2)}` : "MACC project",
        updatedAt: row.created_at ?? null,
        href: "/macc",
      })),
      ...overview.strategy_portfolios.map((row) => ({
        id: row.id,
        type: "strategy" as const,
        title: row.name,
        organization: row.organization || selectedOrganizationName || user?.organization_name || "Organization workspace",
        detail: row.sector?.trim() || "Strategy portfolio",
        updatedAt: row.updated_at ?? null,
        href: "/strategies",
      })),
    ].sort((left, right) => {
      const leftTime = toDate(left.updatedAt)?.getTime() ?? 0;
      const rightTime = toDate(right.updatedAt)?.getTime() ?? 0;
      return rightTime - leftTime;
    });
  }, [overview, selectedOrganizationName, user?.organization_name]);

  const moduleCounts = useMemo(
    () => ({
      co2: records.filter((record) => record.type === "co2").length,
      fuel: records.filter((record) => record.type === "fuel").length,
      macc: records.filter((record) => record.type === "macc").length,
      strategy: records.filter((record) => record.type === "strategy").length,
    }),
    [records],
  );

  const recentRecords = useMemo(() => records.slice(0, 5), [records]);
  const activeModuleCount = useMemo(() => Object.values(moduleCounts).filter((value) => value > 0).length, [moduleCounts]);
  const latestRecord = recentRecords[0] ?? null;

  const adminActions: HomeAction[] = [
    {
      title: "Executive dashboard",
      description: "Open the live workspace dashboard for KPIs, recent activity, and portfolio health.",
      href: "/dashboard",
      cta: "Open dashboard",
      icon: Home,
      tintClassName: "from-sky-500/20 via-cyan-500/10 to-transparent",
    },
    {
      title: "Admin workspace",
      description: "Review approvals, invitations, governance actions, and organization controls.",
      href: "/admin",
      cta: "Open admin",
      icon: ShieldCheck,
      tintClassName: "from-rose-500/20 via-orange-500/10 to-transparent",
    },
    {
      title: "CO2 emissions",
      description: "Move straight into emissions analysis and saved CO2 project workflows.",
      href: "/co2",
      cta: "Open CO2 module",
      icon: BarChart3,
      tintClassName: "from-emerald-500/20 via-teal-500/10 to-transparent",
    },
    {
      title: "Strategy studio",
      description: "Continue strategy and abatement planning across MACC and roadmap portfolios.",
      href: canModule("strategy") ? "/strategies" : "/macc",
      cta: canModule("strategy") ? "Open strategies" : "Open MACC",
      icon: Lightbulb,
      tintClassName: "from-violet-500/20 via-fuchsia-500/10 to-transparent",
    },
  ];

  const memberActions: HomeAction[] = [
    {
      title: "Executive dashboard",
      description: "Open the live workspace dashboard for KPIs, recent activity, and portfolio health.",
      href: "/dashboard",
      cta: "Open dashboard",
      icon: Home,
      tintClassName: "from-sky-500/20 via-cyan-500/10 to-transparent",
    },
    {
      title: "CO2 emissions",
      description: "Review baselines, scenario calculations, and emissions modelling for current projects.",
      href: "/co2",
      cta: "Open CO2 module",
      icon: BarChart3,
      tintClassName: "from-emerald-500/20 via-teal-500/10 to-transparent",
    },
    {
      title: "Fuel and energy",
      description: "Work on operational energy inputs, consumption breakdowns, and efficiency analysis.",
      href: "/fuel-energy",
      cta: "Open energy module",
      icon: Flame,
      tintClassName: "from-amber-500/20 via-orange-500/10 to-transparent",
    },
    {
      title: canModule("strategy") ? "Strategy studio" : "MACC analysis",
      description: canModule("strategy")
        ? "Move into roadmap planning and portfolio decisions for the current workspace."
        : "Continue abatement ranking and project economics inside MACC.",
      href: canModule("strategy") ? "/strategies" : "/macc",
      cta: canModule("strategy") ? "Open strategies" : "Open MACC",
      icon: canModule("strategy") ? Lightbulb : TrendingDown,
      tintClassName: "from-violet-500/20 via-fuchsia-500/10 to-transparent",
    },
  ];

  const mainActions = isAdminUser ? adminActions : memberActions;

  const secondaryLinks = [
    canModule("macc")
      ? { label: "MACC analysis", href: "/macc", icon: TrendingDown }
      : null,
    canModule("admin")
      ? { label: "Admin workspace", href: "/admin", icon: ShieldCheck }
      : null,
    { label: "Profile settings", href: "/profile", icon: User },
  ].filter(Boolean) as Array<{ label: string; href: string; icon: React.ComponentType<{ className?: string }> }>;

  const analyticsCards = [
    {
      label: "Visible records",
      value: String(records.length),
      detail: records.length ? "Saved projects and portfolios in scope" : "No saved records yet",
      icon: Database,
    },
    {
      label: "Active modules",
      value: String(activeModuleCount),
      detail: activeModuleCount ? "Modules with at least one saved record" : "No active modules yet",
      icon: Activity,
    },
    {
      label: "Recent activity",
      value: String(auditRows.length),
      detail: auditRows.length ? "Recent audited events returned for your role" : "No recent audited activity",
      icon: Shield,
    },
    {
      label: "Latest update",
      value: latestRecord ? formatDate(latestRecord.updatedAt) : "N/A",
      detail: latestRecord ? latestRecord.title : "No recent project update",
      icon: Clock3,
    },
  ];

  if (loading) {
    return <PageLoadingState title="Loading workspace home" description="Collecting workspace records, recent activity, and shortcuts for this signed-in role." />;
  }

  if (error && !overview && !requiresOrganizationSelection) {
    return <EmptyState title="Workspace home unavailable" description={error} icon={Database} />;
  }

  const view: HomeViewModel = {
    workspaceName: workspaceName || getPlatformWorkspaceLabel(user?.role),
    roleText: roleLabel(user?.role),
    userName: user?.full_name || "Workspace User",
    email: user?.email || "No email available",
    isAdminUser,
    analyticsCards,
    mainActions,
    secondaryLinks,
    recentRecords,
    moduleCounts,
    canAdmin: canModule("admin"),
    onLogout: () => {
      logout();
      navigate("/login", { replace: true });
    },
  };

  if (activeWebsiteVariant === "editorial") {
    return <EditorialHomeGateway view={view} />;
  }

  return <CurrentHomeGateway view={view} />;
}