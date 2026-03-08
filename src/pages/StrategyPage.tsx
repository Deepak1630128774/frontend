import { CHART_TOKEN_COLORS } from "@/lib/chart-theme";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/auth";
import { useAppVariantSystem } from "@/components/app-shell/AppVariantProvider";
import { useThemeSystem } from "@/components/theme/ThemeProvider";
import { api } from "@/api/client";
import { EmptyState, InlineStatus, PageLoadingState } from "@/components/state-panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StrategyPortfolio } from "@/types";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BarChart3,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { getWorkspacePageLayoutForVariant } from "@/lib/theme-page-layout";
import { cn } from "@/lib/utils";

type ChartType = "bar" | "line" | "area";
type JsxCompatComponent = (props: Record<string, unknown>) => JSX.Element | null;

const RechartsXAxis = XAxis as unknown as JsxCompatComponent;
const RechartsYAxis = YAxis as unknown as JsxCompatComponent;
const RechartsTooltip = Tooltip as unknown as JsxCompatComponent;
const RechartsLine = Line as unknown as JsxCompatComponent;
const RechartsArea = Area as unknown as JsxCompatComponent;
const RechartsBar = Bar as unknown as JsxCompatComponent;

interface FuelCalcItem {
  unique_code: string;
  org_name: string;
  sector: string;
}

interface MaccItem {
  id: string;
  project_name: string;
  organization: string;
  mac: number;
  total_co2_diff: number;
}

interface StrategyAnalysis {
  baseline: {
    calc_id: string;
    organization: string;
    sector: string;
    by_scope?: Record<string, number>;
    total: number;
  };
  portfolio: {
    selected_count: number;
    annual_abatement: number;
  };
  pathway: Array<{ year: number; emission: number }>;
  macc_curve: Array<{ id?: string; project_name: string; mac: number; co2_reduction: number }>;
  recommendations: string[];
}

function makePortfolio(defaultOrganization = ""): StrategyPortfolio {
  return {
    id: `STR-${Date.now()}`,
    name: "My Strategy Portfolio",
    organization: defaultOrganization,
    sector: "",
    baseline_calc_id: "",
    selected_macc_projects: [],
  };
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="theme-data-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

export default function StrategyPage() {
  const { token, can, hasOrganizationDataScope, requiresOrganizationSelection, selectedOrganizationId, selectedOrganizationName, user } = useAuth();
  const { activeAppVariant } = useAppVariantSystem();
  const { activeTheme } = useThemeSystem();
  const scopedOrganizationName = (selectedOrganizationName || user?.organization_name || "").trim();
  const organizationLocked = Boolean(scopedOrganizationName);

  const [portfolios, setPortfolios] = useState([] as StrategyPortfolio[]);
  const [fuelCalcs, setFuelCalcs] = useState([] as FuelCalcItem[]);
  const [maccItems, setMaccItems] = useState([] as MaccItem[]);
  const [selectedId, setSelectedId] = useState("");
  const [portfolio, setPortfolio] = useState(makePortfolio(scopedOrganizationName) as StrategyPortfolio);
  const [analysis, setAnalysis] = useState(null as StrategyAnalysis | null);
  const [listSearch, setListSearch] = useState("");
  const [listPage, setListPage] = useState(1);
  const [analysisYears, setAnalysisYears] = useState(10);
  const [pathwayChartType, setPathwayChartType] = useState("bar" as ChartType);
  const [maccChartType, setMaccChartType] = useState("bar" as ChartType);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canCreate = can("strategy", "create");
  const canSave = selectedId ? can("strategy", "save", { projectId: selectedId }) : can("strategy", "create");
  const canDelete = selectedId ? can("strategy", "delete", { projectId: selectedId }) : false;
  const formReadOnly = !canSave && Boolean(selectedId);

  const loadMasterData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    if (requiresOrganizationSelection && !hasOrganizationDataScope) {
      setPortfolios([]);
      setFuelCalcs([]);
      setMaccItems([]);
      setSelectedId("");
      setPortfolio(makePortfolio(scopedOrganizationName));
      setAnalysis(null);
      setLoading(false);
      setError("");
      setMessage("");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const [portfolioRows, fuelRows, maccRows] = await Promise.all([
        api.get<StrategyPortfolio[]>("/api/strategy/portfolios", token),
        api.get<FuelCalcItem[]>("/api/fuel-energy/calculations", token),
        api.get<MaccItem[]>("/api/macc/projects", token),
      ]);
      setPortfolios(portfolioRows ?? []);
      setFuelCalcs(fuelRows ?? []);
      setMaccItems(maccRows ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load strategy data");
    } finally {
      setLoading(false);
    }
  }, [hasOrganizationDataScope, requiresOrganizationSelection, scopedOrganizationName, selectedOrganizationId, token]);

  const scopeBadgeLabel = user?.role === "owner" || user?.role === "super_admin"
    ? (selectedOrganizationName ? `Scoped to ${selectedOrganizationName}` : "Platform governance scope")
    : `Workspace ${selectedOrganizationName || user?.organization_name || "Organization workspace"}`;

  useEffect(() => {
    void loadMasterData();
  }, [loadMasterData]);

  useEffect(() => {
    setSelectedId("");
    setPortfolio(makePortfolio(scopedOrganizationName));
    setAnalysis(null);
    setMessage("");
    setError("");
  }, [scopedOrganizationName, selectedOrganizationId]);

  const filteredPortfolios = useMemo(
    () =>
      portfolios.filter((item) => {
        const text = `${item.id} ${item.name} ${item.organization}`.toLowerCase();
        return text.includes(listSearch.toLowerCase());
      }),
    [portfolios, listSearch],
  );
  const selectedMaccDetails = useMemo(
    () => maccItems.filter((item) => portfolio.selected_macc_projects.includes(item.id)),
    [maccItems, portfolio.selected_macc_projects],
  );
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredPortfolios.length / pageSize));
  const pagedPortfolios = filteredPortfolios.slice((listPage - 1) * pageSize, listPage * pageSize);
  const pathwayRows = analysis?.pathway.map((row) => ({ label: `Y${row.year}`, value: row.emission })) ?? [];
  const maccCurveRows = analysis?.macc_curve.map((row) => ({ label: row.project_name, value: row.mac })) ?? [];
  const actionState = analyzing || saving ? "loading" : message ? "success" : "idle";
  const actionLabel = analyzing ? "Running strategy analysis" : saving ? "Saving portfolio" : message;
  const pageLayout = getWorkspacePageLayoutForVariant(activeTheme, activeAppVariant);

  useEffect(() => {
    if (listPage > totalPages) {
      setListPage(totalPages);
    }
  }, [listPage, totalPages]);

  function applyBaseline(calcId: string) {
    const calc = fuelCalcs.find((item) => item.unique_code === calcId);
    setPortfolio((current) => ({
      ...current,
      baseline_calc_id: calcId,
      organization: scopedOrganizationName || calc?.org_name || current.organization,
      sector: calc?.sector ?? current.sector,
    }));
  }

  async function selectPortfolio(id: string) {
    if (!token) return;
    try {
      setError("");
      setMessage("");
      const data = await api.get<StrategyPortfolio>(`/api/strategy/portfolios/${id}`, token);
      setSelectedId(id);
      setPortfolio(data);
      setAnalysis(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load strategy portfolio");
    }
  }

  function resetPortfolio() {
    setSelectedId("");
    setPortfolio(makePortfolio(scopedOrganizationName));
    setAnalysis(null);
    setMessage("");
    setError("");
  }

  async function savePortfolio() {
    if (!token) return;
    try {
      setSaving(true);
      setError("");
      await api.post("/api/strategy/portfolios", { ...portfolio, organization: scopedOrganizationName || portfolio.organization }, token);
      setSelectedId(portfolio.id);
      setMessage("Strategy portfolio saved.");
      await loadMasterData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save strategy portfolio");
    } finally {
      setSaving(false);
    }
  }

  async function deletePortfolio() {
    if (!token || !selectedId) {
      setError("Select a strategy portfolio to delete.");
      return;
    }
    try {
      setError("");
      await api.del(`/api/strategy/portfolios/${selectedId}`, token);
      setDeleteOpen(false);
      resetPortfolio();
      setMessage("Strategy portfolio deleted.");
      await loadMasterData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete strategy portfolio");
    }
  }

  async function runAnalysis() {
    if (!token) return;
    if (!portfolio.baseline_calc_id) {
      setError("Select a baseline calculation first.");
      return;
    }
    try {
      setAnalyzing(true);
      setError("");
      const data = await api.post<StrategyAnalysis>(
        "/api/strategy/analyze",
        {
          baseline_calc_id: portfolio.baseline_calc_id,
          selected_macc_projects: portfolio.selected_macc_projects,
          years: analysisYears,
        },
        token,
      );
      setAnalysis(data);
      setMessage("Strategy analysis generated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze strategy portfolio");
    } finally {
      setAnalyzing(false);
    }
  }

  function renderChart(rows: Array<{ label: string; value: number }>, chartType: ChartType, color: string) {
    if (!rows.length) {
      return (
        <EmptyState
          icon={BarChart3}
          title="No analysis data available"
          description="Run a strategy analysis after choosing a baseline and MACC projects to populate this view."
          className="min-h-[280px]"
        />
      );
    }

    if (chartType === "line") {
      return (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <RechartsXAxis dataKey="label" tick={{ fontSize: 12 }} />
            <RechartsYAxis tick={{ fontSize: 12 }} />
            <RechartsTooltip />
            <RechartsLine type="monotone" dataKey="value" stroke={color} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "area") {
      return (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <RechartsXAxis dataKey="label" tick={{ fontSize: 12 }} />
            <RechartsYAxis tick={{ fontSize: 12 }} />
            <RechartsTooltip />
            <RechartsArea type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <RechartsXAxis dataKey="label" tick={{ fontSize: 12 }} />
          <RechartsYAxis tick={{ fontSize: 12 }} />
          <RechartsTooltip />
          <RechartsBar dataKey="value">
            {rows.map((_, index) => (
              <Cell key={`${chartType}-${index}`} fill={index % 2 === 0 ? color : `${color}CC`} />
            ))}
          </RechartsBar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (loading) {
    return <PageLoadingState title="Loading strategy data" description="Fetching portfolios, baseline calculations, and MACC projects before analysis starts." />;
  }

  if (requiresOrganizationSelection && !hasOrganizationDataScope) {
    return (
      <EmptyState
        title="Select an organization"
        description="Choose an organization from the sidebar before loading portfolios, baseline calculations, or MACC projects."
        icon={BarChart3}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="theme-floating-panel theme-hero-panel p-4 md:p-5">
        <div className={cn("flex flex-col gap-5 xl:flex-row xl:justify-between", pageLayout.heroBodyAlign)}>
          <div className={pageLayout.heroTitleAlign}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-primary/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">{scopeBadgeLabel}</span>
          </div>
          <h1 className="theme-hero-text text-3xl font-bold">Strategies</h1>
          <p className="theme-hero-copy mt-1 text-sm">Portfolio management and long-range decarbonization scenario analysis.</p>
          </div>
          <div className="flex flex-wrap gap-2">
          {canCreate && <Button variant="outline" onClick={resetPortfolio}><Plus className="mr-2 h-4 w-4" />New Strategy</Button>}
          <Button variant="outline" onClick={() => void loadMasterData()}><RefreshCcw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button variant="secondary" onClick={runAnalysis} disabled={analyzing}><BarChart3 className="mr-2 h-4 w-4" />{analyzing ? "Analyzing..." : "Analyze"}</Button>
          {canSave && <Button onClick={savePortfolio} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "Saving..." : "Save"}</Button>}
          {canDelete && <Button variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-primary/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">{filteredPortfolios.length} portfolios</span>
          <span className="inline-flex items-center rounded-full border border-primary/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">{fuelCalcs.length} baselines</span>
          <span className="inline-flex items-center rounded-full border border-primary/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">{maccItems.length} MACC projects</span>
          {portfolio.baseline_calc_id && <span className="inline-flex items-center rounded-full border border-primary/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">Baseline set</span>}
          {portfolio.selected_macc_projects.length > 0 && <span className="inline-flex items-center rounded-full border border-primary/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">{portfolio.selected_macc_projects.length} MACC projects</span>}
          {listSearch && <span className="inline-flex items-center rounded-full border border-primary/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">Filter {listSearch}</span>}
          <InlineStatus state={actionState} label={actionLabel ?? ""} className="ml-auto" />
        </div>
        <div className={cn("mt-4", pageLayout.summaryGrid)}>
          <MetricCard label="Portfolios" value={String(portfolios.length)} />
          <MetricCard label="Selected levers" value={String(portfolio.selected_macc_projects.length)} />
          <MetricCard label="Analysis years" value={String(analysisYears)} />
          <MetricCard label="Recommendations" value={String(analysis?.recommendations.length ?? 0)} />
        </div>
      </div>

      {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
      {message && <Alert><AlertDescription>{message}</AlertDescription></Alert>}

      <div className={pageLayout.shellGrid}>
        <Card className={cn("theme-widget-card", pageLayout.listRailClass)}>
          <CardHeader>
            <CardTitle>Saved Portfolios</CardTitle>
            <CardDescription>Select a strategy portfolio to edit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search portfolios..." value={listSearch} onChange={(e) => { setListSearch(e.target.value); setListPage(1); }} />
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-primary/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">Page {listPage} of {totalPages}</span>
              <span className="inline-flex items-center rounded-full border border-primary/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">{portfolios.length} total</span>
              {listSearch ? <span className="inline-flex items-center rounded-full border border-primary/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">Search active</span> : null}
            </div>
            <div className="space-y-2">
              {pagedPortfolios.map((item) => (
                <button key={item.id} type="button" className={`theme-selectable-card ${selectedId === item.id ? "theme-selectable-card-active" : ""}`} onClick={() => void selectPortfolio(item.id)}>
                  <div className="font-medium">{item.name || item.id}</div>
                  <div className="text-sm text-muted-foreground">{item.organization || "Unknown organization"}</div>
                  <div className="text-xs text-muted-foreground">{item.sector || "No sector"}</div>
                </button>
              ))}
              {!pagedPortfolios.length && (
                <EmptyState
                  icon={Search}
                  title={listSearch ? "No matching portfolios" : "No strategy portfolios yet"}
                  description={listSearch ? "Try a broader search term or clear the filter to browse all portfolios." : "Create a strategy portfolio to combine a baseline with selected MACC projects."}
                  actionLabel={!listSearch && canCreate ? "Create portfolio" : undefined}
                  onAction={!listSearch && canCreate ? resetPortfolio : undefined}
                  className="min-h-[180px]"
                />
              )}
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <Button variant="outline" size="sm" disabled={listPage <= 1} onClick={() => setListPage((p) => Math.max(1, p - 1))}>Prev</Button>
              <span>Page {listPage} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={listPage >= totalPages} onClick={() => setListPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
            </div>
          </CardContent>
        </Card>

        <div className={cn(pageLayout.detailStackClass, pageLayout.contentClass)}>
          <Card className="theme-widget-card">
            <CardHeader>
              <CardTitle>Portfolio Inputs</CardTitle>
              <CardDescription>Combine a fuel baseline with selected MACC projects.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2"><Label htmlFor="portfolio_id">Portfolio ID</Label><Input id="portfolio_id" value={portfolio.id} onChange={(e) => setPortfolio({ ...portfolio, id: e.target.value })} disabled={formReadOnly} /></div>
              <div className="space-y-2"><Label htmlFor="portfolio_name">Portfolio Name</Label><Input id="portfolio_name" value={portfolio.name} onChange={(e) => setPortfolio({ ...portfolio, name: e.target.value })} disabled={formReadOnly} /></div>
              <div className="space-y-2"><Label htmlFor="organization">Organization</Label><Input id="organization" value={portfolio.organization} onChange={(e) => setPortfolio({ ...portfolio, organization: e.target.value })} disabled={formReadOnly || organizationLocked} /></div>
              <div className="space-y-2"><Label htmlFor="sector">Sector</Label><Input id="sector" value={portfolio.sector} onChange={(e) => setPortfolio({ ...portfolio, sector: e.target.value })} disabled={formReadOnly} /></div>
              <div className="space-y-2">
                <Label htmlFor="baseline">Baseline Calculation</Label>
                <select id="baseline" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" value={portfolio.baseline_calc_id} onChange={(e) => applyBaseline(e.target.value)} disabled={formReadOnly}>
                  <option value="">Select baseline</option>
                  {fuelCalcs.map((calc) => <option key={calc.unique_code} value={calc.unique_code}>{calc.unique_code} - {calc.org_name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="analysis_years">Analysis Years</Label>
                <Input id="analysis_years" type="number" min={1} max={50} value={analysisYears} onChange={(e) => setAnalysisYears(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} />
              </div>
              <div className="space-y-2 md:col-span-2 xl:col-span-3">
                <Label htmlFor="macc_select">Selected MACC Projects</Label>
                <select id="macc_select" multiple className="flex min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" value={portfolio.selected_macc_projects} onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value);
                  setPortfolio((current) => ({ ...current, selected_macc_projects: selected }));
                }} disabled={formReadOnly}>
                  {maccItems.map((item) => <option key={item.id} value={item.id}>{item.project_name || item.id}</option>)}
                </select>
                <p className="text-xs text-muted-foreground">Hold Ctrl or Cmd to select multiple projects.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="theme-widget-card">
            <CardHeader>
              <CardTitle>Selected MACC Snapshot</CardTitle>
              <CardDescription>Current project mix included in this strategy portfolio.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>MAC</TableHead>
                    <TableHead>CO₂ Reduction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedMaccDetails.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.project_name || row.id}</TableCell>
                      <TableCell>{row.organization || "-"}</TableCell>
                      <TableCell>{Number(row.mac).toFixed(2)}</TableCell>
                      <TableCell>{Number(row.total_co2_diff).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {!selectedMaccDetails.length && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <EmptyState
                          icon={BarChart3}
                          title="No MACC projects selected"
                          description="Pick one or more MACC projects to build the current strategy mix."
                          className="min-h-[150px] border-0 bg-transparent shadow-none"
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {analysis && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Baseline Total" value={analysis.baseline.total.toFixed(2)} />
                <MetricCard label="Projects Selected" value={String(analysis.portfolio.selected_count)} />
                <MetricCard label="Annual Abatement" value={analysis.portfolio.annual_abatement.toFixed(2)} />
                <MetricCard label="Year End Emission" value={(analysis.pathway[analysis.pathway.length - 1]?.emission ?? 0).toFixed(2)} />
              </div>

              <Card className="theme-widget-card">
                <CardHeader>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle>Annual CO₂ Emission Pathway</CardTitle>
                      <CardDescription>Projected emissions based on selected MACC projects.</CardDescription>
                    </div>
                    <select className="h-10 rounded-md border bg-background px-3 text-sm" value={pathwayChartType} onChange={(e) => setPathwayChartType(e.target.value as ChartType)}>
                      <option value="bar">Bar</option>
                      <option value="line">Line</option>
                      <option value="area">Area</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent>{renderChart(pathwayRows, pathwayChartType, CHART_TOKEN_COLORS[5])}</CardContent>
              </Card>

              <Card className="theme-widget-card">
                <CardHeader>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle>MAC Curve</CardTitle>
                      <CardDescription>Lower cost projects appear earlier in the ranked curve.</CardDescription>
                    </div>
                    <select className="h-10 rounded-md border bg-background px-3 text-sm" value={maccChartType} onChange={(e) => setMaccChartType(e.target.value as ChartType)}>
                      <option value="bar">Bar</option>
                      <option value="line">Line</option>
                      <option value="area">Area</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent>{renderChart(maccCurveRows, maccChartType, CHART_TOKEN_COLORS[2])}</CardContent>
              </Card>

              <Card className="theme-widget-card">
                <CardHeader>
                  <CardTitle>Strategic Recommendations</CardTitle>
                  <CardDescription>System-generated guidance from the strategy analysis.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {analysis.recommendations.map((item, index) => (
                    <div key={`${index}-${item}`} className="rounded-lg border bg-muted/20 p-3 text-sm">{item}</div>
                  ))}
                  {!analysis.recommendations.length && (
                    <EmptyState
                      title="No recommendations generated"
                      description="The current scenario did not produce recommendation notes yet."
                      className="min-h-[150px]"
                    />
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {!analysis && (
            <Card className="theme-widget-card">
              <CardHeader>
                <CardTitle>Analysis Ready State</CardTitle>
                <CardDescription>Choose a baseline and one or more MACC projects, then run the portfolio analysis.</CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyState
                  icon={BarChart3}
                  title="No analysis has been run yet"
                  description="Once analysis runs, this area will show pathway charts, MAC curve insights, and strategic recommendations."
                  actionLabel="Run analysis"
                  onAction={() => void runAnalysis()}
                  className="min-h-[240px]"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete strategy portfolio?</AlertDialogTitle>
            <AlertDialogDescription>Portfolio and selected snapshot references will be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(event) => { event.preventDefault(); void deletePortfolio(); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
