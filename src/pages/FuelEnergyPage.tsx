import { CHART_TOKEN_COLORS } from "@/lib/chart-theme";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/auth";
import { useAppVariantSystem } from "@/components/app-shell/AppVariantProvider";
import { useThemeSystem } from "@/components/theme/ThemeProvider";
import type { FuelBaselineRow, FuelCalculation, Scope } from "@/types";
import { api } from "@/api/client";
import { EmptyState, InlineStatus, PageLoadingState } from "@/components/state-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BarChart3,
  Calculator,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { getWorkspacePageLayoutForVariant } from "@/lib/theme-page-layout";
import { cn } from "@/lib/utils";

type TrendChartType = "bar" | "line" | "area";
type EnergyMixChartType = "pie" | "bar";

interface FuelListItem {
  unique_code: string;
  org_name: string;
  entity_name?: string;
  unit_name?: string;
  project_owner?: string;
  sector: string;
  baseline_year: number;
  previous_year: number;
  target_year: number;
}

interface FuelDetailResponse {
  meta: {
    unique_code: string;
    org_name: string;
    entity_name?: string;
    unit_name?: string;
    project_owner?: string;
    sector: string;
    baseline_year: number;
    previous_year: number;
    target_year: number;
    baseline_production: number;
    previous_year_production: number;
    growth_rate: number;
    target_production: number;
  };
  baseline_rows: FuelBaselineRow[];
  reductions_pct: Record<Scope, number>;
  baseline_input: Record<string, number>;
}

interface FuelSummary {
  previous_by_scope: Record<Scope, number>;
  baseline_by_scope: Record<Scope, number>;
  target_by_scope: Record<Scope, number>;
  energy_by_scope: Record<Scope, number>;
  totals: {
    previous: number;
    baseline: number;
    target: number;
    energy: number;
  };
}

interface FuelTrendResponse {
  trend: Array<{ label: string; value: number; type: string; year_number?: number }>;
  energy_mix_by_year: Array<{ year_number: number; items: Array<{ material: string; energy_total: number }> }>;
}

const scopeOptions: Scope[] = ["Scope 1", "Scope 2", "Scope 3"];
const CHART_COLORS = CHART_TOKEN_COLORS;

type JsxCompatComponent = (props: Record<string, unknown>) => JSX.Element | null;

const RechartsXAxis = XAxis as unknown as JsxCompatComponent;
const RechartsYAxis = YAxis as unknown as JsxCompatComponent;
const RechartsTooltip = Tooltip as unknown as JsxCompatComponent;
const RechartsLegend = Legend as unknown as JsxCompatComponent;
const RechartsLine = Line as unknown as JsxCompatComponent;
const RechartsArea = Area as unknown as JsxCompatComponent;
const RechartsBar = Bar as unknown as JsxCompatComponent;
const RechartsPie = Pie as unknown as JsxCompatComponent;

function makeRow(): FuelBaselineRow {
  return {
    scope: "Scope 1",
    name: "",
    uom: "kg",
    quantity: 0,
    ef: 0,
    emission: 0,
    energy_factor: 0,
    energy_uom: "GJ",
    energy: 0,
  };
}

function makeCalculation(defaultOrganization = ""): FuelCalculation {
  const year = new Date().getFullYear();
  return {
    unique_code: `CALC-${Date.now()}`,
    org_name: defaultOrganization,
    entity_name: "",
    unit_name: "",
    project_owner: "",
    sector: "",
    baseline_year: year,
    previous_year: year,
    target_year: year + 5,
    baseline_production: 0,
    previous_year_production: 0,
    growth_rate: 0,
    target_production: 0,
    materials_baseline: [makeRow()],
    reductions: {
      "Scope 1": 0,
      "Scope 2": 0,
      "Scope 3": 0,
    },
    base_emissions: {
      "Scope 1": 0,
      "Scope 2": 0,
      "Scope 3": 0,
    },
  };
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampPositiveInt(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="theme-data-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export default function FuelEnergyPage() {
  const { token, can, hasOrganizationDataScope, requiresOrganizationSelection, selectedOrganizationId, selectedOrganizationName, user } = useAuth();
  const { activeAppVariant } = useAppVariantSystem();
  const { activeTheme } = useThemeSystem();
  const scopedOrganizationName = (selectedOrganizationName || user?.organization_name || "").trim();
  const organizationLocked = Boolean(scopedOrganizationName);

  const [items, setItems] = useState([] as FuelListItem[]);
  const [materials, setMaterials] = useState([] as string[]);
  const [form, setForm] = useState(makeCalculation(scopedOrganizationName) as FuelCalculation);
  const [selectedCode, setSelectedCode] = useState("");
  const [summary, setSummary] = useState(null as FuelSummary | null);
  const [trends, setTrends] = useState(null as FuelTrendResponse | null);
  const [yearDataYear, setYearDataYear] = useState(1);
  const [yearRows, setYearRows] = useState([makeRow()] as FuelBaselineRow[]);
  const [listSearch, setListSearch] = useState("");
  const [listPage, setListPage] = useState(1);
  const [trendChartType, setTrendChartType] = useState("bar" as TrendChartType);
  const [energyMixChartType, setEnergyMixChartType] = useState("pie" as EnergyMixChartType);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [computing, setComputing] = useState(false);
  const [savingYearly, setSavingYearly] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canCreate = can("fuel", "create");
  const canSave = selectedCode ? can("fuel", "save", { projectId: selectedCode }) : can("fuel", "create");
  const canDelete = selectedCode ? can("fuel", "delete", { projectId: selectedCode }) : false;
  const canYearSave = selectedCode
    ? can("fuel", "yearly_save", {
        projectId: selectedCode,
        subEntityKey: "yearly_data_rows",
        subEntityId: "yearly_data_rows",
      })
    : false;
  const formReadOnly = !canSave && Boolean(selectedCode);

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const text = `${item.unique_code} ${item.org_name} ${item.sector}`.toLowerCase();
        return text.includes(listSearch.toLowerCase());
      }),
    [items, listSearch],
  );

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const pagedItems = filteredItems.slice((listPage - 1) * pageSize, listPage * pageSize);

  const latestEnergyMix = trends?.energy_mix_by_year?.[trends.energy_mix_by_year.length - 1]?.items ?? [];
  const trendRows = trends?.trend ?? [];
  const actionState = computing || saving || savingYearly ? "loading" : message ? "success" : "idle";
  const actionLabel = computing
    ? "Computing summary"
    : saving
      ? "Saving calculation"
      : savingYearly
        ? "Saving yearly data"
        : message;
  const pageLayout = getWorkspacePageLayoutForVariant(activeTheme, activeAppVariant);
  const summaryScopeRows = summary
    ? scopeOptions.map((scope) => ({
        scope,
        previous: summary.previous_by_scope[scope] ?? 0,
        baseline: summary.baseline_by_scope[scope] ?? 0,
        target: summary.target_by_scope[scope] ?? 0,
        energy: summary.energy_by_scope[scope] ?? 0,
      }))
    : [];

  const loadList = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    if (requiresOrganizationSelection && !hasOrganizationDataScope) {
      setItems([]);
      setMaterials([]);
      setForm(makeCalculation(scopedOrganizationName));
      setSelectedCode("");
      setSummary(null);
      setTrends(null);
      setYearRows([makeRow()]);
      setLoading(false);
      setError("");
      setMessage("");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const [calcItems, materialItems] = await Promise.all([
        api.get<FuelListItem[]>("/api/fuel-energy/calculations", token),
        api.get<string[]>("/api/fuel-energy/materials", token),
      ]);
      setItems(calcItems ?? []);
      setMaterials(materialItems ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load fuel calculations");
    } finally {
      setLoading(false);
    }
  }, [hasOrganizationDataScope, requiresOrganizationSelection, scopedOrganizationName, selectedOrganizationId, token]);

  const scopeBadgeLabel = user?.role === "owner" || user?.role === "super_admin"
    ? (selectedOrganizationName ? `Scoped to ${selectedOrganizationName}` : "Platform governance scope")
    : `Workspace ${selectedOrganizationName || user?.organization_name || "Organization workspace"}`;

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    setSelectedCode("");
    setForm(makeCalculation(scopedOrganizationName));
    setSummary(null);
    setTrends(null);
    setYearRows([makeRow()]);
    setMessage("");
    setError("");
  }, [scopedOrganizationName, selectedOrganizationId]);

  useEffect(() => {
    if (listPage > totalPages) {
      setListPage(totalPages);
    }
  }, [listPage, totalPages]);

  async function selectCalculation(code: string) {
    if (!token) return;

    try {
      setError("");
      setMessage("");
      const data = await api.get<FuelDetailResponse>(`/api/fuel-energy/calculations/${code}`, token);
      setSelectedCode(code);
      setForm({
        unique_code: data.meta.unique_code,
        org_name: data.meta.org_name,
        entity_name: data.meta.entity_name ?? "",
        unit_name: data.meta.unit_name ?? "",
        project_owner: data.meta.project_owner ?? "",
        sector: data.meta.sector,
        baseline_year: Number(data.meta.baseline_year),
        previous_year: Number(data.meta.previous_year),
        target_year: Number(data.meta.target_year),
        baseline_production: Number(data.meta.baseline_production ?? 0),
        previous_year_production: Number(data.meta.previous_year_production ?? 0),
        growth_rate: Number(data.meta.growth_rate ?? 0),
        target_production: Number(data.meta.target_production ?? 0),
        materials_baseline: data.baseline_rows?.length ? data.baseline_rows : [makeRow()],
        reductions: data.reductions_pct,
        base_emissions: {
          "Scope 1": Number(data.baseline_input["1"] ?? 0),
          "Scope 2": Number(data.baseline_input["2"] ?? 0),
          "Scope 3": Number(data.baseline_input["3"] ?? 0),
        },
      });

      const trendData = await api.get<FuelTrendResponse>(`/api/fuel-energy/calculations/${code}/trends`, token);
      setTrends(trendData);
      setSummary(null);
      await loadYearlyFuel(code, clampPositiveInt(yearDataYear));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calculation details");
    }
  }

  async function loadYearlyFuel(code: string, year: number) {
    if (!token) return;

    try {
      setError("");
      const response = await api.get<{ rows: Array<Partial<FuelBaselineRow> & { material?: string }> }>(
        `/api/fuel-energy/calculations/${code}/yearly/${year}`,
        token,
      );
      const rows = response.rows?.map((row) => ({
        scope: (row.scope as Scope) ?? "Scope 1",
        name: row.name ?? row.material ?? "",
        uom: row.uom ?? "kg",
        quantity: Number(row.quantity ?? 0),
        ef: Number(row.ef ?? 0),
        emission: Number(row.emission ?? 0),
        energy_factor: Number(row.energy_factor ?? 0),
        energy_uom: row.energy_uom ?? "GJ",
        energy: Number(row.energy ?? 0),
      })) ?? [makeRow()];
      setYearRows(rows.length ? rows : [makeRow()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load yearly fuel data");
    }
  }

  function resetForm() {
    setSelectedCode("");
    setForm(makeCalculation(scopedOrganizationName));
    setSummary(null);
    setTrends(null);
    setYearRows([makeRow()]);
    setYearDataYear(1);
    setMessage("");
    setError("");
  }

  function updateRow(index: number, patch: Partial<FuelBaselineRow>) {
    setForm((current) => {
      const nextRows = [...current.materials_baseline];
      nextRows[index] = { ...nextRows[index], ...patch };
      nextRows[index].emission = Number(nextRows[index].quantity) * Number(nextRows[index].ef);
      nextRows[index].energy = Number(nextRows[index].quantity) * Number(nextRows[index].energy_factor);
      return { ...current, materials_baseline: nextRows };
    });
  }

  function updateYearRow(index: number, patch: Partial<FuelBaselineRow>) {
    setYearRows((current) => {
      const nextRows = [...current];
      nextRows[index] = { ...nextRows[index], ...patch };
      nextRows[index].emission = Number(nextRows[index].quantity) * Number(nextRows[index].ef);
      nextRows[index].energy = Number(nextRows[index].quantity) * Number(nextRows[index].energy_factor);
      return nextRows;
    });
  }

  async function saveCalculation() {
    if (!token) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");
      await api.post<{ status: string; unique_code: string }>(
        "/api/fuel-energy/calculations",
        {
          ...form,
          org_name: scopedOrganizationName || form.org_name,
          base_emissions:
            form.baseline_year === form.previous_year
              ? null
              : {
                  "Scope 1": form.base_emissions?.["Scope 1"] ?? 0,
                  "Scope 2": form.base_emissions?.["Scope 2"] ?? 0,
                  "Scope 3": form.base_emissions?.["Scope 3"] ?? 0,
                },
        },
        token,
      );
      setSelectedCode(form.unique_code);
      setMessage("Calculation saved.");
      await loadList();
      await selectCalculation(form.unique_code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save calculation");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCalculation() {
    if (!selectedCode || !token) {
      setError("Select a calculation to delete.");
      return;
    }

    try {
      setError("");
      setMessage("");
      await api.del(`/api/fuel-energy/calculations/${selectedCode}`, token);
      setDeleteOpen(false);
      resetForm();
      setMessage("Calculation deleted.");
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete calculation");
    }
  }

  async function computeSummary() {
    if (!token) return;

    try {
      setComputing(true);
      setError("");
      const payload = {
        baseline_rows: form.materials_baseline,
        reductions_pct: form.reductions,
        baseline_input: {
          "1": form.base_emissions?.["Scope 1"] ?? 0,
          "2": form.base_emissions?.["Scope 2"] ?? 0,
          "3": form.base_emissions?.["Scope 3"] ?? 0,
        },
        same_year: form.baseline_year === form.previous_year,
      };
      const nextSummary = await api.post<FuelSummary>("/api/fuel-energy/summary", payload, token);
      setSummary(nextSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compute summary");
    } finally {
      setComputing(false);
    }
  }

  async function saveYearlyFuelData() {
    if (!selectedCode || !token) {
      setError("Select a calculation first.");
      return;
    }

    try {
      setSavingYearly(true);
      setError("");
      await api.put(
        `/api/fuel-energy/calculations/${selectedCode}/yearly/${yearDataYear}`,
        {
          unique_code: selectedCode,
          year_number: yearDataYear,
          rows: yearRows.map((row) => ({
            material: row.name,
            scope: row.scope,
            uom: row.uom,
            quantity: row.quantity,
            ef: row.ef,
            energy_factor: row.energy_factor,
            energy_uom: row.energy_uom,
          })),
        },
        token,
      );
      setMessage(`Year ${yearDataYear} fuel data saved.`);
      const trendData = await api.get<FuelTrendResponse>(`/api/fuel-energy/calculations/${selectedCode}/trends`, token);
      setTrends(trendData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save yearly fuel data");
    } finally {
      setSavingYearly(false);
    }
  }

  function renderTrendChart() {
    if (!trendRows.length) {
      return (
        <EmptyState
          icon={BarChart3}
          title="No emissions trend yet"
          description="Compute and save a calculation to generate the baseline-to-target trend view."
          className="min-h-[280px]"
        />
      );
    }

    if (trendChartType === "line") {
      return (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trendRows}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <RechartsXAxis dataKey="label" tick={{ fontSize: 12 }} />
            <RechartsYAxis tick={{ fontSize: 12 }} />
            <RechartsTooltip />
            <RechartsLine type="monotone" dataKey="value" stroke={CHART_COLORS[0]} strokeWidth={2} name="Emissions" />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (trendChartType === "area") {
      return (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={trendRows}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <RechartsXAxis dataKey="label" tick={{ fontSize: 12 }} />
            <RechartsYAxis tick={{ fontSize: 12 }} />
            <RechartsTooltip />
            <RechartsArea type="monotone" dataKey="value" stroke={CHART_COLORS[1]} fill={CHART_COLORS[1]} fillOpacity={0.18} name="Emissions" />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={trendRows}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <RechartsXAxis dataKey="label" tick={{ fontSize: 12 }} />
          <RechartsYAxis tick={{ fontSize: 12 }} />
          <RechartsTooltip />
          <RechartsBar dataKey="value" name="Emissions">
            {trendRows.map((_, index) => (
              <Cell key={`trend-cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </RechartsBar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  function renderEnergyMixChart() {
    if (!latestEnergyMix.length) {
      return (
        <EmptyState
          icon={Calculator}
          title="No yearly energy mix yet"
          description="Save yearly fuel rows to unlock the energy mix visualization for the latest year." 
          className="min-h-[280px]"
        />
      );
    }

    if (energyMixChartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={latestEnergyMix}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <RechartsXAxis dataKey="material" tick={{ fontSize: 12 }} />
            <RechartsYAxis tick={{ fontSize: 12 }} />
            <RechartsTooltip />
            <RechartsBar dataKey="energy_total" name="Energy Total">
              {latestEnergyMix.map((_, index) => (
                <Cell key={`mix-cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </RechartsBar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <RechartsPie data={latestEnergyMix} dataKey="energy_total" nameKey="material" outerRadius={92} label>
            {latestEnergyMix.map((_, index) => (
              <Cell key={`mix-pie-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </RechartsPie>
          <RechartsTooltip />
          <RechartsLegend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (loading) {
    return <PageLoadingState title="Loading fuel calculations" description="Fetching saved calculations, materials, and yearly fuel structures for this workspace." />;
  }

  if (requiresOrganizationSelection && !hasOrganizationDataScope) {
    return (
      <EmptyState
        title="Select an organization"
        description="Choose an organization from the sidebar before viewing or editing fuel and energy calculations."
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
            <Badge variant="outline">{scopeBadgeLabel}</Badge>
          </div>
          <h1 className="theme-hero-text text-3xl font-bold">Fuel &amp; Energy</h1>
          <p className="theme-hero-copy mt-1 text-sm">
            Baseline inventory, yearly fuel entry, emission trends, and energy mix analysis.
          </p>
          </div>
          <div className="flex flex-wrap gap-2">
          {canCreate && (
            <Button variant="outline" onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              New Calculation
            </Button>
          )}
          <Button variant="outline" onClick={() => void loadList()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="secondary" onClick={computeSummary} disabled={computing}>
            <Calculator className="mr-2 h-4 w-4" />
            {computing ? "Computing..." : "Compute Summary"}
          </Button>
          {canSave && (
            <Button onClick={saveCalculation} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
          )}
          {canDelete && (
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="outline">{filteredItems.length} calculations</Badge>
          <Badge variant="outline">{form.materials_baseline.length} baseline rows</Badge>
          <Badge variant="outline">{yearRows.length} yearly rows</Badge>
          {selectedCode && <Badge variant="outline">Selected {selectedCode}</Badge>}
          {listSearch && <Badge variant="outline">Filter {listSearch}</Badge>}
          {summary ? <Badge variant="outline">Summary ready</Badge> : null}
          <InlineStatus state={actionState} label={actionLabel ?? ""} className="ml-auto" />
        </div>
        <div className={cn("mt-4", pageLayout.summaryGrid)}>
          <MetricCard label="Saved calculations" value={String(items.length)} />
          <MetricCard label="Baseline rows" value={String(form.materials_baseline.length)} />
          <MetricCard label="Year rows" value={String(yearRows.length)} />
          <MetricCard label="Energy mix" value={latestEnergyMix.length ? "Ready" : "Waiting"} />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div className={pageLayout.shellGrid}>
        <Card className={cn("theme-widget-card", pageLayout.listRailClass)}>
          <CardHeader>
            <CardTitle>Saved Calculations</CardTitle>
            <CardDescription>Select a calculation to edit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search calculations..."
                value={listSearch}
                onChange={(event) => {
                  setListSearch(event.target.value);
                  setListPage(1);
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Page {listPage} of {totalPages}</Badge>
              <Badge variant="outline">{items.length} total</Badge>
              {listSearch ? <Badge variant="outline">Search active</Badge> : null}
            </div>

            <div className="space-y-2">
              {pagedItems.map((item) => (
                <button
                  key={item.unique_code}
                  type="button"
                  className={`theme-selectable-card ${selectedCode === item.unique_code ? "theme-selectable-card-active" : ""}`}
                  onClick={() => void selectCalculation(item.unique_code)}
                >
                  <div className="font-medium">{item.unique_code}</div>
                  <div className="text-sm text-muted-foreground">{item.org_name || "Unknown organization"}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.sector || "No sector"} · Target {item.target_year || "-"}
                  </div>
                </button>
              ))}
              {!pagedItems.length && (
                <EmptyState
                  icon={Search}
                  title={listSearch ? "No matching calculations" : "No calculations yet"}
                  description={listSearch ? "The current filter returned no saved fuel calculations." : "Start a fuel and energy calculation to build baselines, yearly inputs, and energy mix analysis."}
                  actionLabel={!listSearch && canCreate ? "Create calculation" : undefined}
                  onAction={!listSearch && canCreate ? resetForm : undefined}
                  className="min-h-[180px]"
                />
              )}
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <Button variant="outline" size="sm" disabled={listPage <= 1} onClick={() => setListPage((page) => Math.max(1, page - 1))}>
                Prev
              </Button>
              <span>
                Page {listPage} / {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={listPage >= totalPages} onClick={() => setListPage((page) => Math.min(totalPages, page + 1))}>
                Next
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className={cn(pageLayout.detailStackClass, pageLayout.contentClass)}>
          <Card className="theme-widget-card">
            <CardHeader>
              <CardTitle>Core Inputs</CardTitle>
              <CardDescription>Manage the baseline calculation metadata and production assumptions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="unique_code">Unique Code</Label>
                  <Input id="unique_code" value={form.unique_code} onChange={(e) => setForm({ ...form, unique_code: e.target.value })} disabled={formReadOnly} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org_name">Organization</Label>
                  <Input id="org_name" value={form.org_name} onChange={(e) => setForm({ ...form, org_name: e.target.value })} disabled={formReadOnly || organizationLocked} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sector">Sector</Label>
                  <Input id="sector" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} disabled={formReadOnly} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entity_name">Entity Name</Label>
                  <Input id="entity_name" value={form.entity_name ?? ""} onChange={(e) => setForm({ ...form, entity_name: e.target.value })} disabled={formReadOnly} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit_name">Unit Name</Label>
                  <Input id="unit_name" value={form.unit_name ?? ""} onChange={(e) => setForm({ ...form, unit_name: e.target.value })} disabled={formReadOnly} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project_owner">Project Owner</Label>
                  <Input id="project_owner" value={form.project_owner ?? ""} onChange={(e) => setForm({ ...form, project_owner: e.target.value })} disabled={formReadOnly} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="baseline_year">Baseline Year</Label>
                  <Input id="baseline_year" type="number" value={form.baseline_year} onChange={(e) => setForm({ ...form, baseline_year: toNumber(e.target.value) })} disabled={formReadOnly} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="previous_year">Previous Year</Label>
                  <Input id="previous_year" type="number" value={form.previous_year} onChange={(e) => setForm({ ...form, previous_year: toNumber(e.target.value) })} disabled={formReadOnly} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target_year">Target Year</Label>
                  <Input id="target_year" type="number" value={form.target_year} onChange={(e) => setForm({ ...form, target_year: toNumber(e.target.value) })} disabled={formReadOnly} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="baseline_production">Baseline Production</Label>
                  <Input id="baseline_production" type="number" value={form.baseline_production} onChange={(e) => setForm({ ...form, baseline_production: toNumber(e.target.value) })} disabled={formReadOnly} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="previous_year_production">Previous Year Production</Label>
                  <Input id="previous_year_production" type="number" value={form.previous_year_production} onChange={(e) => setForm({ ...form, previous_year_production: toNumber(e.target.value) })} disabled={formReadOnly} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="growth_rate">Growth Rate</Label>
                  <Input id="growth_rate" type="number" value={form.growth_rate} onChange={(e) => setForm({ ...form, growth_rate: toNumber(e.target.value) })} disabled={formReadOnly} />
                </div>
                <div className="space-y-2 md:col-span-2 xl:col-span-1">
                  <Label htmlFor="target_production">Target Production</Label>
                  <Input id="target_production" type="number" value={form.target_production} onChange={(e) => setForm({ ...form, target_production: toNumber(e.target.value) })} disabled={formReadOnly} />
                </div>
              </div>

              {form.baseline_year !== form.previous_year && (
                <div className="space-y-4 rounded-lg border border-dashed p-4">
                  <div>
                    <h3 className="font-medium">Baseline Emissions Input</h3>
                    <p className="text-sm text-muted-foreground">Used when baseline year differs from previous year.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    {scopeOptions.map((scope) => (
                      <div className="space-y-2" key={scope}>
                        <Label htmlFor={`base-${scope}`}>{scope}</Label>
                        <Input
                          id={`base-${scope}`}
                          type="number"
                          value={form.base_emissions?.[scope] ?? 0}
                          onChange={(e) =>
                            setForm((current) => ({
                              ...current,
                              base_emissions: { ...current.base_emissions, [scope]: toNumber(e.target.value) },
                            }))
                          }
                          disabled={formReadOnly}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="theme-widget-card">
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Materials Inventory</CardTitle>
                  <CardDescription>{form.materials_baseline.length} baseline row(s)</CardDescription>
                </div>
                <Button variant="outline" onClick={() => setForm((current) => ({ ...current, materials_baseline: [...current.materials_baseline, makeRow()] }))} disabled={formReadOnly}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Material Row
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <datalist id="fuel-materials">
                {materials.map((material) => (
                  <option value={material} key={material} />
                ))}
              </datalist>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>UOM</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>EF</TableHead>
                      <TableHead>Emission</TableHead>
                      <TableHead>Energy Factor</TableHead>
                      <TableHead>Energy UOM</TableHead>
                      <TableHead>Energy</TableHead>
                      <TableHead className="w-[90px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.materials_baseline.map((row, index) => (
                      <TableRow key={`baseline-${index}`}>
                        <TableCell><Input list="fuel-materials" value={row.name} onChange={(e) => updateRow(index, { name: e.target.value })} disabled={formReadOnly} /></TableCell>
                        <TableCell>
                          <select className="h-10 w-[120px] rounded-md border bg-background px-3 text-sm" value={row.scope} onChange={(e) => updateRow(index, { scope: e.target.value as Scope })} disabled={formReadOnly}>
                            {scopeOptions.map((scope) => (
                              <option key={scope} value={scope}>{scope}</option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell><Input value={row.uom} onChange={(e) => updateRow(index, { uom: e.target.value })} disabled={formReadOnly} /></TableCell>
                        <TableCell><Input type="number" value={row.quantity} onChange={(e) => updateRow(index, { quantity: toNumber(e.target.value) })} disabled={formReadOnly} /></TableCell>
                        <TableCell><Input type="number" value={row.ef} onChange={(e) => updateRow(index, { ef: toNumber(e.target.value) })} disabled={formReadOnly} /></TableCell>
                        <TableCell><Input type="number" value={row.emission} readOnly /></TableCell>
                        <TableCell><Input type="number" value={row.energy_factor} onChange={(e) => updateRow(index, { energy_factor: toNumber(e.target.value) })} disabled={formReadOnly} /></TableCell>
                        <TableCell><Input value={row.energy_uom} onChange={(e) => updateRow(index, { energy_uom: e.target.value })} disabled={formReadOnly} /></TableCell>
                        <TableCell><Input type="number" value={row.energy} readOnly /></TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => setForm((current) => ({ ...current, materials_baseline: current.materials_baseline.filter((_, i) => i !== index) }))} disabled={form.materials_baseline.length === 1 || formReadOnly}>
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className={pageLayout.analysisGrid}>
            <Card className="theme-widget-card">
              <CardHeader>
                <CardTitle>Reduction Targets (%)</CardTitle>
                <CardDescription>Set target reduction by emission scope.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
                {scopeOptions.map((scope) => (
                  <div className="space-y-2" key={scope}>
                    <Label htmlFor={`reduction-${scope}`}>{scope}</Label>
                    <Input
                      id={`reduction-${scope}`}
                      type="number"
                      value={form.reductions[scope]}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          reductions: { ...current.reductions, [scope]: toNumber(e.target.value) },
                        }))
                      }
                      disabled={formReadOnly}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="theme-widget-card">
              <CardHeader>
                <CardTitle>Summary</CardTitle>
                <CardDescription>Computed totals from baseline rows and reduction targets.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {summary ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <MetricCard label="Previous Emissions" value={summary.totals.previous.toFixed(2)} />
                      <MetricCard label="Baseline Emissions" value={summary.totals.baseline.toFixed(2)} />
                      <MetricCard label="Target Emissions" value={summary.totals.target.toFixed(2)} />
                      <MetricCard label="Energy Use" value={summary.totals.energy.toFixed(2)} />
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Scope</TableHead>
                            <TableHead>Previous</TableHead>
                            <TableHead>Baseline</TableHead>
                            <TableHead>Target</TableHead>
                            <TableHead>Energy</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {summaryScopeRows.map((row) => (
                            <TableRow key={row.scope}>
                              <TableCell>{row.scope}</TableCell>
                              <TableCell>{row.previous.toFixed(2)}</TableCell>
                              <TableCell>{row.baseline.toFixed(2)}</TableCell>
                              <TableCell>{row.target.toFixed(2)}</TableCell>
                              <TableCell>{row.energy.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                ) : (
                  <EmptyState
                    icon={Calculator}
                    title="No summary generated"
                    description="Run Compute Summary to calculate previous, baseline, target, and energy totals."
                    className="min-h-[220px]"
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="theme-widget-card">
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Year-Specific Fuel Data</CardTitle>
                  <CardDescription>Load and save yearly rows for trend analysis.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Input type="number" min={1} value={yearDataYear} onChange={(e) => setYearDataYear(clampPositiveInt(e.target.value))} className="w-[120px]" />
                  <Button variant="outline" onClick={() => selectedCode ? void loadYearlyFuel(selectedCode, yearDataYear) : setError("Select a calculation first.")}>Load Year</Button>
                  {canYearSave && <Button onClick={saveYearlyFuelData} disabled={savingYearly}>{savingYearly ? "Saving..." : "Save Year Data"}</Button>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>UOM</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>EF</TableHead>
                      <TableHead>Emission</TableHead>
                      <TableHead>Energy Factor</TableHead>
                      <TableHead>Energy UOM</TableHead>
                      <TableHead>Energy</TableHead>
                      <TableHead className="w-[90px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {yearRows.map((row, index) => (
                      <TableRow key={`year-${index}`}>
                        <TableCell><Input value={row.name} onChange={(e) => updateYearRow(index, { name: e.target.value })} disabled={!canYearSave} /></TableCell>
                        <TableCell>
                          <select className="h-10 w-[120px] rounded-md border bg-background px-3 text-sm" value={row.scope} onChange={(e) => updateYearRow(index, { scope: e.target.value as Scope })} disabled={!canYearSave}>
                            {scopeOptions.map((scope) => (
                              <option key={scope} value={scope}>{scope}</option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell><Input value={row.uom} onChange={(e) => updateYearRow(index, { uom: e.target.value })} disabled={!canYearSave} /></TableCell>
                        <TableCell><Input type="number" value={row.quantity} onChange={(e) => updateYearRow(index, { quantity: toNumber(e.target.value) })} disabled={!canYearSave} /></TableCell>
                        <TableCell><Input type="number" value={row.ef} onChange={(e) => updateYearRow(index, { ef: toNumber(e.target.value) })} disabled={!canYearSave} /></TableCell>
                        <TableCell><Input type="number" value={row.emission} readOnly /></TableCell>
                        <TableCell><Input type="number" value={row.energy_factor} onChange={(e) => updateYearRow(index, { energy_factor: toNumber(e.target.value) })} disabled={!canYearSave} /></TableCell>
                        <TableCell><Input value={row.energy_uom} onChange={(e) => updateYearRow(index, { energy_uom: e.target.value })} disabled={!canYearSave} /></TableCell>
                        <TableCell><Input type="number" value={row.energy} readOnly /></TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => setYearRows((current) => current.filter((_, i) => i !== index))} disabled={yearRows.length === 1 || !canYearSave}>
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button variant="outline" onClick={() => setYearRows((current) => [...current, makeRow()])} disabled={!canYearSave}>
                <Plus className="mr-2 h-4 w-4" />
                Add Year Row
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className={pageLayout.chartGrid}>
        <Card className="theme-widget-card">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Emission Trends</CardTitle>
                <CardDescription>View previous, target, and actual yearly emissions.</CardDescription>
              </div>
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={trendChartType} onChange={(e) => setTrendChartType(e.target.value as TrendChartType)}>
                <option value="bar">Bar</option>
                <option value="line">Line</option>
                <option value="area">Area</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>{renderTrendChart()}</CardContent>
        </Card>

        <Card className="theme-widget-card">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Energy Mix Analysis</CardTitle>
                <CardDescription>
                  Latest yearly energy mix from saved yearly fuel rows.
                </CardDescription>
              </div>
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={energyMixChartType} onChange={(e) => setEnergyMixChartType(e.target.value as EnergyMixChartType)}>
                <option value="pie">Pie</option>
                <option value="bar">Bar</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>{renderEnergyMixChart()}</CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete fuel calculation?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the selected calculation and any saved yearly fuel rows.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(event) => {
              event.preventDefault();
              void deleteCalculation();
            }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
