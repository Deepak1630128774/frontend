import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  CalendarRange,
  Clock3,
  Database,
  Download,
  FolderKanban,
  Search,
  ShieldCheck,
} from "lucide-react";

import { api } from "@/api/client";
import { useAuth } from "@/auth";
import { EmptyState, PageLoadingState } from "@/components/state-panel";
import { useThemeSystem } from "@/components/theme/ThemeProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CHART_AXIS_TICK, CHART_GRID_STROKE, CHART_TOKEN_COLORS } from "@/lib/chart-theme";
import { getPlatformWorkspaceLabel, getWorkspaceDisplayName } from "@/lib/tenant";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const chartColors = CHART_TOKEN_COLORS;
const moduleLabels = {
  all: "All records",
  co2: "CO2 projects",
  fuel: "Fuel calculations",
  macc: "MACC projects",
  strategy: "Strategy portfolios",
} as const;

type HeroWindow = "90D" | "6M" | "YTD";
type ModuleFilter = keyof typeof moduleLabels;
type RecordType = Exclude<ModuleFilter, "all">;

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
  module_key?: string | null;
  actor_email?: string | null;
}

interface DashboardRecord {
  id: string;
  type: RecordType;
  title: string;
  organization: string;
  detail: string;
  status: string;
  updatedAt: string | null;
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value: string | null | undefined): string {
  const parsed = toDate(value);
  if (!parsed) return "No timestamp";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatDateTime(value: string | null | undefined): string {
  const parsed = toDate(value);
  if (!parsed) return "No timestamp";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function startDateForWindow(window: HeroWindow): Date {
  const now = new Date();
  if (window === "90D") return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  if (window === "6M") return new Date(now.getTime() - 183 * 24 * 60 * 60 * 1000);
  return new Date(now.getFullYear(), 0, 1);
}

function buildHeroSeries(records: DashboardRecord[], window: HeroWindow) {
  const start = startDateForWindow(window);
  const buckets = new Map<string, number>();

  records.forEach((record) => {
    const parsed = toDate(record.updatedAt);
    if (!parsed || parsed < start) return;
    const key = `${parsed.getFullYear()}-${parsed.getMonth()}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  });

  const entries = Array.from(buckets.entries())
    .map(([key, total]) => {
      const [year, month] = key.split("-").map(Number);
      return {
        key,
        label: new Intl.DateTimeFormat(undefined, { month: "short" }).format(new Date(year, month, 1)),
        total,
      };
    })
    .sort((left, right) => left.key.localeCompare(right.key));

  return entries.length > 0 ? entries : [{ key: "empty", label: "Current", total: 0 }];
}

function summarizeAuditAction(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

export default function DashboardPage() {
  const { token, user, hasOrganizationDataScope, requiresOrganizationSelection, selectedOrganizationId, selectedOrganizationName } = useAuth();
  const { activeTheme } = useThemeSystem();
  const [heroWindow, setHeroWindow] = useState<HeroWindow>("YTD");
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<SavedProjectsOverviewResponse | null>(null);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [auditUnavailable, setAuditUnavailable] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    if (requiresOrganizationSelection && !hasOrganizationDataScope) {
      setOverview(null);
      setAuditRows([]);
      setAuditUnavailable(false);
      setError("");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    void Promise.allSettled([
      api.get<SavedProjectsOverviewResponse>("/api/admin/saved-projects-overview", token),
      api.get<AuditRow[]>("/api/admin/audit?limit=8", token),
    ]).then(([overviewResult, auditResult]) => {
      if (cancelled) return;

      if (overviewResult.status === "fulfilled") {
        setOverview(overviewResult.value);
      } else {
        setError(overviewResult.reason instanceof Error ? overviewResult.reason.message : "Unable to load dashboard facts");
      }

      if (auditResult.status === "fulfilled") {
        setAuditRows(auditResult.value ?? []);
        setAuditUnavailable(false);
      } else {
        setAuditRows([]);
        setAuditUnavailable(true);
      }

      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [hasOrganizationDataScope, requiresOrganizationSelection, selectedOrganizationId, token]);

  const records = useMemo<DashboardRecord[]>(() => {
    if (!overview) return [];

    return [
      ...overview.co2_projects.map((row) => ({
        id: row.project_code,
        type: "co2" as const,
        title: row.project_name || row.project_code,
        organization: row.organization || selectedOrganizationName || user?.organization_name || "Organization workspace",
        detail: row.target_year ? `Target year ${row.target_year}` : "CO2 project",
        status: row.status?.trim() || "Saved",
        updatedAt: row.updated_at ?? null,
      })),
      ...overview.fuel_calculations.map((row) => ({
        id: row.unique_code,
        type: "fuel" as const,
        title: row.unique_code,
        organization: row.org_name || selectedOrganizationName || user?.organization_name || "Organization workspace",
        detail: row.sector?.trim() || "Fuel calculation",
        status: row.target_year ? `Target ${row.target_year}` : "Saved",
        updatedAt: row.updated_at ?? null,
      })),
      ...overview.macc_projects.map((row) => ({
        id: row.id,
        type: "macc" as const,
        title: row.project_name || row.id,
        organization: row.organization || selectedOrganizationName || user?.organization_name || "Organization workspace",
        detail: typeof row.total_co2_diff === "number" ? `${row.total_co2_diff.toFixed(2)} tCO2e delta` : "MACC project",
        status: typeof row.mac === "number" ? `MAC ${row.mac.toFixed(2)}` : "Saved",
        updatedAt: row.created_at ?? null,
      })),
      ...overview.strategy_portfolios.map((row) => ({
        id: row.id,
        type: "strategy" as const,
        title: row.name,
        organization: row.organization || selectedOrganizationName || user?.organization_name || "Organization workspace",
        detail: row.sector?.trim() || "Strategy portfolio",
        status: row.baseline_calc_id ? `Baseline ${row.baseline_calc_id}` : "Saved",
        updatedAt: row.updated_at ?? null,
      })),
    ].sort((left, right) => {
      const leftTime = toDate(left.updatedAt)?.getTime() ?? 0;
      const rightTime = toDate(right.updatedAt)?.getTime() ?? 0;
      return rightTime - leftTime;
    });
  }, [overview, selectedOrganizationName, user?.organization_name]);

  const filteredRecords = useMemo(
    () => (moduleFilter === "all" ? records : records.filter((record) => record.type === moduleFilter)),
    [moduleFilter, records],
  );
  const heroSeries = useMemo(() => buildHeroSeries(filteredRecords, heroWindow), [filteredRecords, heroWindow]);
  const latestRecord = filteredRecords[0] ?? null;

  const moduleCounts = useMemo(
    () => ({
      co2: records.filter((record) => record.type === "co2").length,
      fuel: records.filter((record) => record.type === "fuel").length,
      macc: records.filter((record) => record.type === "macc").length,
      strategy: records.filter((record) => record.type === "strategy").length,
    }),
    [records],
  );

  const moduleMix = useMemo(
    () => [
      { label: "CO2", value: moduleCounts.co2 },
      { label: "Fuel", value: moduleCounts.fuel },
      { label: "MACC", value: moduleCounts.macc },
      { label: "Strategy", value: moduleCounts.strategy },
    ].filter((row) => row.value > 0),
    [moduleCounts],
  );

  const spotlightCards = useMemo(
    () => [
      {
        key: "co2",
        eyebrow: "CO2 module",
        title: "Projects",
        value: String(moduleCounts.co2),
        subtext: overview?.co2_projects[0]?.updated_at ? `Latest update ${formatDate(overview.co2_projects[0].updated_at)}` : "No saved CO2 projects yet",
      },
      {
        key: "fuel",
        eyebrow: "Fuel module",
        title: "Calculations",
        value: String(moduleCounts.fuel),
        subtext: overview?.fuel_calculations[0]?.updated_at ? `Latest update ${formatDate(overview.fuel_calculations[0].updated_at)}` : "No saved fuel calculations yet",
      },
      {
        key: "macc",
        eyebrow: "MACC module",
        title: "Projects",
        value: String(moduleCounts.macc),
        subtext: overview?.macc_projects[0]?.created_at ? `Latest update ${formatDate(overview.macc_projects[0].created_at)}` : "No saved MACC projects yet",
      },
      {
        key: "strategy",
        eyebrow: "Strategy module",
        title: "Portfolios",
        value: String(moduleCounts.strategy),
        subtext: overview?.strategy_portfolios[0]?.updated_at ? `Latest update ${formatDate(overview.strategy_portfolios[0].updated_at)}` : "No saved portfolios yet",
      },
    ],
    [moduleCounts, overview],
  );

  const platformWorkspaceLabel = getPlatformWorkspaceLabel(user?.role);
  const workspaceName = selectedOrganizationName || getWorkspaceDisplayName({
    role: user?.role,
    organizationName: user?.organization_name,
    organizationSlug: user?.organization_slug,
    tenantScope: user?.tenant_context?.scope,
  });
  const centeredHero = activeTheme.layout.heroAlign === "center";
  const scopeBadgeLabel = user?.role === "owner" || user?.role === "super_admin"
    ? (selectedOrganizationName ? `Scoped to ${selectedOrganizationName}` : "Platform governance scope")
    : `Workspace ${workspaceName}`;

  if (loading) {
    return <PageLoadingState title="Loading workspace dashboard" description="Collecting saved project records, recent activity, and module totals for this workspace." />;
  }

  if (requiresOrganizationSelection && !hasOrganizationDataScope) {
    return (
      <EmptyState
        title="Select an organization"
        description="Choose an organization from the sidebar to load dashboard records. Leaving it unselected keeps organization data hidden."
        icon={ShieldCheck}
      />
    );
  }

  if (error) {
    return <EmptyState title="Dashboard facts unavailable" description={error} icon={Database} />;
  }

  if (!overview || records.length === 0) {
    return (
      <EmptyState
        title="No factual dashboard data yet"
        description="This dashboard now shows only saved workspace records and audit activity. Create a CO2 project, fuel calculation, MACC project, or strategy portfolio to populate it."
        icon={FolderKanban}
      />
    );
  }

  return (
    <div className="theme-dashboard-stack min-w-0 w-full">
      <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <Card className="theme-widget-card overflow-hidden p-0">
          <div className="theme-dashboard-hero relative overflow-hidden">
            <div className="theme-dashboard-cityline absolute inset-0 opacity-70" />
            <div className="theme-dashboard-hero-glow absolute inset-0" />

            <div className="relative z-10 flex flex-col" style={{ gap: "var(--experience-shell-gap-fluid)", padding: "var(--experience-main-padding)" }}>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className={cn("space-y-4", centeredHero && "xl:max-w-none xl:text-center")}>
                  <div className={cn("flex flex-wrap items-center gap-3", centeredHero && "xl:justify-center")}>
                    <Badge className="gold-kicker border-none shadow-none">Factual workspace dashboard</Badge>
                    <Badge variant="outline">{scopeBadgeLabel}</Badge>
                    <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{activeTheme.environment.mood}</span>
                  </div>
                  <div className={cn("space-y-2", centeredHero && "xl:flex xl:flex-col xl:items-center")}>
                    <h1 className="theme-hero-text max-w-3xl text-3xl font-semibold leading-none md:text-5xl">
                      {workspaceName} dashboard records and activity
                    </h1>
                    <p className="theme-hero-copy max-w-2xl text-sm leading-6 md:text-base">
                      This view is backed only by saved projects, calculations, portfolios, and audit events in the current workspace. No demo metrics or placeholder market data are shown.
                    </p>
                  </div>
                </div>

                <div className="flex w-full min-w-0 flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
                  <div className="theme-topbar-chip flex min-w-0 flex-1 items-center gap-2 text-foreground sm:min-w-[15rem] sm:flex-none">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate text-sm text-muted-foreground">Records update from live workspace data</span>
                  </div>
                  <Button size="icon" variant="ghost" className="theme-topbar-action text-foreground hover:text-foreground">
                    <CalendarRange className="h-4 w-4" />
                  </Button>
                  <Button className="rounded-full">
                    <Download className="mr-2 h-4 w-4" />
                    Export facts
                  </Button>
                </div>
              </div>

              <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="min-w-0 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Select value={moduleFilter} onValueChange={(value) => setModuleFilter(value as ModuleFilter)}>
                      <SelectTrigger className="theme-topbar-chip h-10 w-full max-w-full rounded-full text-foreground sm:w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All records</SelectItem>
                        <SelectItem value="co2">CO2 projects</SelectItem>
                        <SelectItem value="fuel">Fuel calculations</SelectItem>
                        <SelectItem value="macc">MACC projects</SelectItem>
                        <SelectItem value="strategy">Strategy portfolios</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button type="button" variant={heroWindow === "90D" ? "default" : "outline"} className="rounded-full" onClick={() => setHeroWindow("90D")}>
                      90D
                    </Button>
                    <Button type="button" variant={heroWindow === "6M" ? "default" : "outline"} className="rounded-full" onClick={() => setHeroWindow("6M")}>
                      6M
                    </Button>
                    <Button type="button" variant={heroWindow === "YTD" ? "default" : "outline"} className="rounded-full" onClick={() => setHeroWindow("YTD")}>
                      YTD
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="theme-dashboard-stat rounded-[calc(var(--experience-card-radius-fluid)-0.05rem)] border px-4 py-3 text-foreground">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Visible records</div>
                      <div className="mt-2 text-2xl font-semibold text-foreground">{filteredRecords.length}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{moduleLabels[moduleFilter]} in this workspace</div>
                    </div>
                    <div className="theme-dashboard-stat rounded-[calc(var(--experience-card-radius-fluid)-0.05rem)] border px-4 py-3 text-foreground">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Latest update</div>
                      <div className="mt-2 text-2xl font-semibold text-foreground">{latestRecord ? formatDate(latestRecord.updatedAt) : "N/A"}</div>
                      <div className="mt-1 text-sm text-muted-foreground">Most recent saved record timestamp</div>
                    </div>
                    <div className="theme-dashboard-stat rounded-[calc(var(--experience-card-radius-fluid)-0.05rem)] border px-4 py-3 text-foreground">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Audited actions</div>
                      <div className="mt-2 text-2xl font-semibold text-foreground">{auditRows.length}</div>
                      <div className="mt-1 text-sm text-muted-foreground">Recent events available for this role</div>
                    </div>
                  </div>

                  <div className="h-[20rem] md:h-[22rem]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={heroSeries}>
                        <defs>
                          <linearGradient id="dashboardFactFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--foreground) / 0.28)" />
                            <stop offset="95%" stopColor="hsl(var(--foreground) / 0.03)" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
                        <XAxis dataKey="label" tick={CHART_AXIS_TICK} stroke="transparent" />
                        <YAxis tick={CHART_AXIS_TICK} stroke="transparent" allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--popover) / 0.96)",
                            border: "1px solid hsl(var(--border) / 0.65)",
                            borderRadius: "14px",
                            color: "hsl(var(--popover-foreground))",
                          }}
                        />
                        <Area type="monotone" dataKey="total" stroke="hsl(var(--foreground) / 0.92)" strokeWidth={2.6} fill="url(#dashboardFactFill)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="min-w-0 flex flex-col gap-4">
                  <div className="theme-dashboard-stat flex-1 rounded-[calc(var(--experience-card-radius-fluid)-0.05rem)] border p-4 text-foreground">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Workspace facts</div>
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-5 space-y-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Organization</div>
                        <div className="mt-1 text-xl font-semibold text-foreground">{selectedOrganizationName || user?.organization_name || platformWorkspaceLabel}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Signed in role</div>
                        <div className="mt-1 text-xl font-semibold capitalize text-foreground">{user?.role.replace(/_/g, " ")}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Module mix</div>
                        <div className="mt-1 text-xl font-semibold text-foreground">{moduleMix.length} active modules</div>
                      </div>
                    </div>
                  </div>

                  <div className="theme-dashboard-stat rounded-[calc(var(--experience-card-radius-fluid)-0.05rem)] border p-4 text-foreground">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground/8 text-foreground">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Current filter</div>
                        <div className="mt-1 text-xl font-semibold text-foreground">{moduleLabels[moduleFilter]}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid border-t border-border/50 bg-background/55" style={{ gap: "var(--experience-shell-gap-fluid)", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", padding: "calc(var(--experience-main-padding) * 0.9)" }}>
            {spotlightCards.map((card, index) => (
              <motion.div key={card.key} initial="hidden" animate="visible" variants={fadeUp} custom={index + 1}>
                <div className="theme-dashboard-mini-card h-full rounded-[calc(var(--experience-card-radius-fluid)-0.05rem)] border border-border/55 bg-card/78 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{card.eyebrow}</p>
                  <h3 className="mt-2 text-2xl font-semibold text-foreground">{card.title}</h3>
                  <div className="mt-3 text-3xl font-semibold text-foreground">{card.value}</div>
                  <div className="mt-2 text-sm text-muted-foreground">{card.subtext}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </motion.section>

      <div className="grid min-w-0 gap-[var(--experience-shell-gap-fluid)] xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.95fr)]">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5}>
          <Card className="theme-widget-card h-full">
            <CardContent className="p-[var(--experience-main-padding)]">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Saved records</div>
                  <h3 className="mt-2 text-2xl font-semibold">Recent workspace records</h3>
                </div>
                <Badge variant="secondary">Sorted by latest update</Badge>
              </div>

              <div className="mt-5 overflow-hidden rounded-[calc(var(--experience-card-radius-fluid)-0.08rem)] border border-border/50">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Module</TableHead>
                      <TableHead>Record</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Detail</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.slice(0, 8).map((row) => (
                      <TableRow key={`${row.type}-${row.id}`}>
                        <TableCell>
                          <Badge variant="outline" className="rounded-full uppercase">{row.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{row.title}</div>
                          <div className="text-xs text-muted-foreground">{row.status}</div>
                        </TableCell>
                        <TableCell>{row.organization}</TableCell>
                        <TableCell>{row.detail}</TableCell>
                        <TableCell>{formatDateTime(row.updatedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid gap-[var(--experience-shell-gap-fluid)]">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6}>
            <Card className="theme-widget-card">
              <CardContent className="p-[var(--experience-main-padding)]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Module mix</div>
                    <h3 className="mt-2 text-xl font-semibold">Saved records by module</h3>
                  </div>
                  <Badge variant="secondary">Live totals</Badge>
                </div>
                <div className="mt-4 h-[220px] rounded-[calc(var(--experience-card-radius-fluid)-0.05rem)] bg-muted/25 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={moduleMix} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} horizontal={false} />
                      <XAxis type="number" tick={CHART_AXIS_TICK} stroke="transparent" allowDecimals={false} />
                      <YAxis type="category" dataKey="label" width={92} tick={CHART_AXIS_TICK} stroke="transparent" />
                      <Tooltip />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                        {moduleMix.map((entry, index) => (
                          <Cell key={entry.label} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={7}>
            <Card className="theme-widget-card">
              <CardContent className="p-[var(--experience-main-padding)]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Operations feed</div>
                    <h3 className="mt-2 text-xl font-semibold">Recent audit activity</h3>
                  </div>
                  <span className="text-sm text-muted-foreground">{auditUnavailable ? "Unavailable for this role" : "Latest audit rows"}</span>
                </div>

                <div className="mt-4 space-y-3">
                  {auditRows.length > 0 ? (
                    auditRows.map((entry) => (
                      <div key={entry.id} className="theme-data-card flex items-start gap-3 p-3">
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-medium text-foreground">{summarizeAuditAction(entry.action)}</p>
                            <Badge variant="outline" className="rounded-full">{entry.module_key || entry.entity_type}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{entry.actor_email || "System"} · {formatDateTime(entry.created_at)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="theme-data-card p-4 text-sm text-muted-foreground">
                      {auditUnavailable
                        ? "Recent audit entries are not available for the current role, so this panel stays factual by remaining empty."
                        : "No recent audit activity was recorded for this workspace."}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={8}>
            <Card className="theme-widget-card">
              <CardContent className="p-[var(--experience-main-padding)]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Workspace facts</div>
                    <h3 className="mt-2 text-xl font-semibold">Current session details</h3>
                  </div>
                  <Clock3 className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="mt-4 space-y-2">
                  {[
                    { label: "Organization", value: selectedOrganizationName || user?.organization_name || platformWorkspaceLabel },
                    { label: "Workspace slug", value: user?.selected_organization_slug || user?.organization_slug || "platform" },
                    { label: "Role", value: user?.role.replace(/_/g, " ") || "Unknown" },
                    { label: "Visible module filter", value: moduleLabels[moduleFilter] },
                  ].map((item) => (
                    <div key={item.label} className="theme-data-card flex items-center justify-between p-3">
                      <div className="text-sm text-muted-foreground">{item.label}</div>
                      <div className="text-sm font-semibold text-foreground capitalize">{item.value}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
