import { CHART_TOKEN_COLORS } from "@/lib/chart-theme";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/auth";
import { useAppVariantSystem } from "@/components/app-shell/AppVariantProvider";
import { useThemeSystem } from "@/components/theme/ThemeProvider";
import type { Co2CostRow, Co2DataRow, Co2Project } from "@/types";
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
type JsxCompatComponent = (props: Record<string, unknown>) => JSX.Element | null;

const RechartsXAxis = XAxis as unknown as JsxCompatComponent;
const RechartsYAxis = YAxis as unknown as JsxCompatComponent;
const RechartsTooltip = Tooltip as unknown as JsxCompatComponent;
const RechartsLegend = Legend as unknown as JsxCompatComponent;
const RechartsLine = Line as unknown as JsxCompatComponent;
const RechartsArea = Area as unknown as JsxCompatComponent;
const RechartsBar = Bar as unknown as JsxCompatComponent;

interface Co2ListItem {
  project_code: string;
  organization: string;
  project_name: string;
  target_year: string;
  calculation_method: "absolute" | "specific";
  status?: string;
}

interface TrackingRow {
  material_name: string;
  row_index: number;
  absolute_value: number | null;
  specific_value: number | null;
}

interface TrackingState {
  input_rows: TrackingRow[];
  output_rows: TrackingRow[];
  amp_value: number | null;
}

interface Co2TrendResponse {
  absolute_trend: Array<{ label: string; value: number; type: string; year_number?: number }>;
  specific_trend: Array<{ label: string; value: number; type: string; year_number?: number }>;
}

interface StatusRow {
  status: string;
  comment: string;
  updated_by_email: string;
  updated_at: string;
}

function makeDataRow(material = ""): Co2DataRow {
  return {
    material,
    uom: "kg",
    ef: 0,
    abs_before: 0,
    abs_after: 0,
    spec_before: 0,
    spec_after: 0,
  };
}

function makeCostRow(parameter = "OPEX Cost"): Co2CostRow {
  return {
    parameter,
    uom: "INR",
    before: 0,
    after: 0,
  };
}

function makeProject(defaultOrganization = ""): Co2Project {
  const year = new Date().getFullYear();
  return {
    project_code: `PRJ-${Date.now()}`,
    organization: defaultOrganization,
    entity_name: "",
    unit_name: "",
    project_name: "",
    base_year: `${year}`,
    target_year: `${year + 5}`,
    implementation_date: `${year}-01-01`,
    capex: "",
    life_span: "10",
    project_owner: "",
    input_data: [makeDataRow("Input 1")],
    output_data: [makeDataRow("Output 1")],
    costing_data: [
      makeCostRow("OPEX Cost (Excluding Fuel and Energy)"),
      makeCostRow("OPEX Cost (Only Fuel and Energy)"),
    ],
    amp_before: 1,
    amp_after: 1,
    amp_uom: "t/tp",
    calculation_method: "absolute",
    status: "Planned",
  };
}

function normalizeDataRows(rows: unknown): Co2DataRow[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const value = row as Record<string, unknown>;
    return {
      material: String(value.material ?? ""),
      uom: String(value.uom ?? "kg"),
      ef: Number(value.ef ?? 0),
      abs_before: Number(value.abs_before ?? 0),
      abs_after: Number(value.abs_after ?? 0),
      spec_before: Number(value.spec_before ?? 0),
      spec_after: Number(value.spec_after ?? 0),
    };
  });
}

function normalizeCostRows(rows: unknown): Co2CostRow[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const value = row as Record<string, unknown>;
    return {
      parameter: String(value.parameter ?? "Cost"),
      uom: String(value.uom ?? "INR"),
      before: Number(value.before ?? 0),
      after: Number(value.after ?? 0),
    };
  });
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
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

export default function Co2Page() {
  const { token, can, hasOrganizationDataScope, requiresOrganizationSelection, selectedOrganizationId, selectedOrganizationName, user } = useAuth();
  const { activeAppVariant } = useAppVariantSystem();
  const { activeTheme } = useThemeSystem();
  const scopedOrganizationName = (selectedOrganizationName || user?.organization_name || "").trim();
  const organizationLocked = Boolean(scopedOrganizationName);

  const [items, setItems] = useState([] as Co2ListItem[]);
  const [selectedCode, setSelectedCode] = useState("");
  const [project, setProject] = useState(makeProject(scopedOrganizationName) as Co2Project);
  const [calcResult, setCalcResult] = useState(null as { emission_results: Record<string, number>; costing_results: Record<string, number> } | null);
  const [trends, setTrends] = useState(null as Co2TrendResponse | null);
  const [statusHistory, setStatusHistory] = useState([] as StatusRow[]);
  const [statusComment, setStatusComment] = useState("");
  const [trackingYears, setTrackingYears] = useState([] as number[]);
  const [trackingYear, setTrackingYear] = useState(new Date().getFullYear());
  const [trackingState, setTrackingState] = useState({ input_rows: [], output_rows: [], amp_value: null } as TrackingState);
  const [listSearch, setListSearch] = useState("");
  const [listPage, setListPage] = useState(1);
  const [absoluteTrendChartType, setAbsoluteTrendChartType] = useState("bar" as TrendChartType);
  const [specificTrendChartType, setSpecificTrendChartType] = useState("bar" as TrendChartType);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingTracking, setSavingTracking] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canCreate = can("co2", "create");
  const canSave = selectedCode ? can("co2", "save", { projectId: selectedCode }) : can("co2", "create");
  const canDelete = selectedCode ? can("co2", "delete", { projectId: selectedCode }) : false;
  const canStatusUpdate = selectedCode ? can("co2", "status", { projectId: selectedCode }) : false;
  const canTrackingSave = selectedCode
    ? can("co2", "tracking_save", {
        projectId: selectedCode,
        subEntityKey: "input_rows",
        subEntityId: "input_rows",
      })
    : false;
  const formReadOnly = !canSave && Boolean(selectedCode);

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const text = `${item.project_code} ${item.project_name} ${item.organization}`.toLowerCase();
        return text.includes(listSearch.toLowerCase());
      }),
    [items, listSearch],
  );

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const pagedItems = filteredItems.slice((listPage - 1) * pageSize, listPage * pageSize);
  const rowCount = project.input_data.length + project.output_data.length + project.costing_data.length;
  const actionState = calculating || saving || savingTracking ? "loading" : message ? "success" : "idle";
  const actionLabel = calculating
    ? "Calculating project"
    : saving
      ? "Saving project"
      : savingTracking
        ? "Saving tracking year"
        : message;
  const pageLayout = getWorkspacePageLayoutForVariant(activeTheme, activeAppVariant);

  const loadList = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    if (requiresOrganizationSelection && !hasOrganizationDataScope) {
      setItems([]);
      setSelectedCode("");
      setProject(makeProject(scopedOrganizationName));
      setCalcResult(null);
      setTrends(null);
      setStatusHistory([]);
      setTrackingYears([]);
      setLoading(false);
      setError("");
      setMessage("");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const rows = await api.get<Co2ListItem[]>("/api/co2/projects", token);
      setItems(rows ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load CO2 projects");
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
    setProject(makeProject(scopedOrganizationName));
    setCalcResult(null);
    setTrends(null);
    setStatusHistory([]);
    setTrackingYears([]);
    setTrackingState({ input_rows: [], output_rows: [], amp_value: null });
    setMessage("");
    setError("");
  }, [scopedOrganizationName, selectedOrganizationId]);

  useEffect(() => {
    if (listPage > totalPages) {
      setListPage(totalPages);
    }
  }, [listPage, totalPages]);

  async function refreshProjectDetails(code: string) {
    if (!token) return;
    const [years, trendData, statuses] = await Promise.all([
      api.get<number[]>(`/api/co2/projects/${code}/tracking/years`, token),
      api.get<Co2TrendResponse>(`/api/co2/projects/${code}/trends`, token),
      api.get<StatusRow[]>(`/api/admin/project-status/${code}`, token),
    ]);
    setTrackingYears(years ?? []);
    setTrends(trendData);
    setStatusHistory(statuses ?? []);
    if (statuses?.length) {
      setProject((current) => ({ ...current, status: statuses[0].status || current.status }));
    }
  }

  async function selectProject(code: string) {
    if (!token) return;
    try {
      setError("");
      setMessage("");
      const data = await api.get<Co2Project>(`/api/co2/projects/${code}`, token);
      setSelectedCode(code);
      setProject({
        ...data,
        input_data: normalizeDataRows(data.input_data),
        output_data: normalizeDataRows(data.output_data),
        costing_data: normalizeCostRows(data.costing_data),
        calculation_method: data.calculation_method ?? "absolute",
        status: data.status ?? "Planned",
      });
      setCalcResult({
        emission_results: (data.emission_results ?? {}) as Record<string, number>,
        costing_results: (data.costing_results ?? {}) as Record<string, number>,
      });
      await refreshProjectDetails(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project details");
    }
  }

  function resetProject() {
    setSelectedCode("");
    setProject(makeProject(scopedOrganizationName));
    setCalcResult(null);
    setTrackingYears([]);
    setTrackingYear(new Date().getFullYear());
    setTrackingState({ input_rows: [], output_rows: [], amp_value: null });
    setTrends(null);
    setStatusHistory([]);
    setStatusComment("");
    setError("");
    setMessage("");
  }

  function updateDataRow(type: "input_data" | "output_data", index: number, patch: Partial<Co2DataRow>) {
    setProject((current) => {
      const rows = [...current[type]];
      rows[index] = { ...rows[index], ...patch };
      return { ...current, [type]: rows };
    });
  }

  function updateCostRow(index: number, patch: Partial<Co2CostRow>) {
    setProject((current) => {
      const rows = [...current.costing_data];
      rows[index] = { ...rows[index], ...patch };
      return { ...current, costing_data: rows };
    });
  }

  function updateTrackingRow(section: "input_rows" | "output_rows", index: number, patch: Partial<TrackingRow>) {
    setTrackingState((current) => {
      const rows = [...current[section]];
      rows[index] = { ...rows[index], ...patch };
      return { ...current, [section]: rows };
    });
  }

  async function calculate() {
    if (!token) return;
    try {
      setCalculating(true);
      setError("");
      const primaryOutputBefore = Number(project.output_data[0]?.abs_before ?? 0);
      const primaryOutputAfter = Number(project.output_data[0]?.abs_after ?? 0);
      const data = await api.post<{ emission_results: Record<string, number>; costing_results: Record<string, number> }>(
        "/api/co2/calculate",
        {
          method: project.calculation_method,
          input_data: project.input_data,
          output_data: project.output_data,
          costing_data: project.costing_data,
          amp_before: project.amp_before,
          amp_after: project.amp_after,
          primary_output_before: primaryOutputBefore,
          primary_output_after: primaryOutputAfter,
        },
        token,
      );
      setCalcResult(data);
      setMessage("Calculation complete.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to calculate project results");
    } finally {
      setCalculating(false);
    }
  }

  async function saveProject() {
    if (!token) return;
    try {
      setSaving(true);
      setError("");
      setMessage("");
      await api.post(
        "/api/co2/projects",
        {
          ...project,
          organization: scopedOrganizationName || project.organization,
          emission_results: calcResult?.emission_results ?? {},
          costing_results: calcResult?.costing_results ?? {},
        },
        token,
      );
      setSelectedCode(project.project_code);
      setMessage("Project saved.");
      await loadList();
      await refreshProjectDetails(project.project_code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save project");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject() {
    if (!selectedCode || !token) {
      setError("Select a project to delete.");
      return;
    }

    try {
      setError("");
      await api.del(`/api/co2/projects/${selectedCode}`, token);
      setDeleteOpen(false);
      resetProject();
      setMessage("Project deleted.");
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
    }
  }

  async function loadTrackingYear() {
    if (!token) return;
    if (!selectedCode) {
      setError("Select a project first.");
      return;
    }
    try {
      setError("");
      const data = await api.get<TrackingState>(`/api/co2/projects/${selectedCode}/tracking/${trackingYear}`, token);
      setTrackingState({
        input_rows: data.input_rows ?? [],
        output_rows: data.output_rows ?? [],
        amp_value: data.amp_value ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tracking year");
    }
  }

  async function saveTrackingYear() {
    if (!token || !selectedCode) {
      setError("Select a project first.");
      return;
    }
    try {
      setSavingTracking(true);
      setError("");
      await api.put(`/api/co2/projects/${selectedCode}/tracking/${trackingYear}`, trackingState, token);
      setMessage(`Tracking saved for ${trackingYear}.`);
      await refreshProjectDetails(selectedCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save tracking year");
    } finally {
      setSavingTracking(false);
    }
  }

  async function updateStatus() {
    if (!selectedCode || !token) return;
    try {
      setError("");
      await api.post(
        `/api/admin/project-status/${selectedCode}?status=${encodeURIComponent(project.status ?? "Planned")}&comment=${encodeURIComponent(statusComment)}`,
        {},
        token,
      );
      setMessage("Status updated.");
      setStatusComment("");
      await refreshProjectDetails(selectedCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update project status");
    }
  }

  function renderTrendChart(
    data: Array<{ label: string; value: number; type: string; year_number?: number }>,
    chartType: TrendChartType,
    color: string,
  ) {
    if (!data.length) {
      return (
        <EmptyState
          icon={BarChart3}
          title="No trend data yet"
          description="Save and calculate a project first to unlock yearly trend visuals."
          className="min-h-[280px]"
        />
      );
    }

    if (chartType === "line") {
      return (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <RechartsXAxis dataKey="label" tick={{ fontSize: 12 }} />
            <RechartsYAxis tick={{ fontSize: 12 }} />
            <RechartsTooltip />
            <RechartsLine type="monotone" dataKey="value" stroke={color} strokeWidth={2} name="Value" />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "area") {
      return (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <RechartsXAxis dataKey="label" tick={{ fontSize: 12 }} />
            <RechartsYAxis tick={{ fontSize: 12 }} />
            <RechartsTooltip />
            <RechartsArea type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.18} name="Value" />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <RechartsXAxis dataKey="label" tick={{ fontSize: 12 }} />
          <RechartsYAxis tick={{ fontSize: 12 }} />
          <RechartsTooltip />
          <RechartsBar dataKey="value" name="Value">
            {data.map((_, index) => (
              <Cell key={`trend-${index}`} fill={index % 2 === 0 ? color : `${color}CC`} />
            ))}
          </RechartsBar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (loading) {
    return <PageLoadingState title="Loading CO2 projects" description="Bringing in project history, tracking years, and chart metadata for the selected workspace." />;
  }

  if (requiresOrganizationSelection && !hasOrganizationDataScope) {
    return (
      <EmptyState
        title="Select an organization"
        description="Choose an organization from the sidebar before viewing or editing CO2 projects."
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
          <h1 className="theme-hero-text text-3xl font-bold">CO₂ Emissions Projects</h1>
          <p className="theme-hero-copy mt-1 text-sm">Project data, emission calculation, tracking, and trend analysis.</p>
          </div>
          <div className="flex flex-wrap gap-2">
          {canCreate && (
            <Button variant="outline" onClick={resetProject}>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          )}
          <Button variant="outline" onClick={() => void loadList()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="secondary" onClick={calculate} disabled={calculating}>
            <Calculator className="mr-2 h-4 w-4" />
            {calculating ? "Calculating..." : "Calculate"}
          </Button>
          {canSave && (
            <Button onClick={saveProject} disabled={saving}>
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
          <Badge variant="outline">{filteredItems.length} projects</Badge>
          <Badge variant="outline">{rowCount} editable rows</Badge>
          <Badge variant="outline">{trackingYears.length} tracking years</Badge>
          {selectedCode && <Badge variant="outline">Selected {selectedCode}</Badge>}
          {listSearch && <Badge variant="outline">Filter {listSearch}</Badge>}
          <InlineStatus state={actionState} label={actionLabel ?? ""} className="ml-auto" />
        </div>
        <div className={cn("mt-4", pageLayout.summaryGrid)}>
          <MetricCard label="Project register" value={String(items.length)} />
          <MetricCard label="Tracking years" value={String(trackingYears.length)} />
          <MetricCard label="Rows in model" value={String(rowCount)} />
          <MetricCard label="Trend charts" value={trends ? "Ready" : "Waiting"} />
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
            <CardTitle>Projects</CardTitle>
            <CardDescription>Select a project to edit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search projects..."
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
                  key={item.project_code}
                  type="button"
                  className={`theme-selectable-card ${selectedCode === item.project_code ? "theme-selectable-card-active" : ""}`}
                  onClick={() => void selectProject(item.project_code)}
                >
                  <div className="font-medium">{item.project_name || item.project_code}</div>
                  <div className="text-sm text-muted-foreground">{item.organization || "Unknown organization"}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.target_year} · {item.calculation_method} · {item.status ?? "Planned"}
                  </div>
                </button>
              ))}
              {!pagedItems.length && (
                <EmptyState
                  icon={Search}
                  title={listSearch ? "No matching projects" : "No projects yet"}
                  description={listSearch ? "Try a different keyword or clear the filter to browse all CO2 projects." : "Create the first CO2 project to start calculation, tracking, and status workflows."}
                  actionLabel={!listSearch && canCreate ? "Create project" : undefined}
                  onAction={!listSearch && canCreate ? resetProject : undefined}
                  className="min-h-[180px]"
                />
              )}
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <Button variant="outline" size="sm" disabled={listPage <= 1} onClick={() => setListPage((page) => Math.max(1, page - 1))}>Prev</Button>
              <span>Page {listPage} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={listPage >= totalPages} onClick={() => setListPage((page) => Math.min(totalPages, page + 1))}>Next</Button>
            </div>
          </CardContent>
        </Card>

        <div className={cn(pageLayout.detailStackClass, pageLayout.contentClass)}>
          <Card className="theme-widget-card">
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>{rowCount} editable rows across input, output, and costing sections.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2"><Label htmlFor="project_code">Project Code</Label><Input id="project_code" value={project.project_code} onChange={(e) => setProject({ ...project, project_code: e.target.value })} disabled={formReadOnly} /></div>
              <div className="space-y-2"><Label htmlFor="project_name">Project Name</Label><Input id="project_name" value={project.project_name} onChange={(e) => setProject({ ...project, project_name: e.target.value })} disabled={formReadOnly} /></div>
              <div className="space-y-2"><Label htmlFor="organization">Organization</Label><Input id="organization" value={project.organization} onChange={(e) => setProject({ ...project, organization: e.target.value })} disabled={formReadOnly || organizationLocked} /></div>
              <div className="space-y-2"><Label htmlFor="entity_name">Entity</Label><Input id="entity_name" value={project.entity_name} onChange={(e) => setProject({ ...project, entity_name: e.target.value })} disabled={formReadOnly} /></div>
              <div className="space-y-2"><Label htmlFor="unit_name">Unit</Label><Input id="unit_name" value={project.unit_name} onChange={(e) => setProject({ ...project, unit_name: e.target.value })} disabled={formReadOnly} /></div>
              <div className="space-y-2"><Label htmlFor="project_owner">Owner</Label><Input id="project_owner" value={project.project_owner} onChange={(e) => setProject({ ...project, project_owner: e.target.value })} disabled={formReadOnly} /></div>
              <div className="space-y-2"><Label htmlFor="base_year">Base Year</Label><Input id="base_year" value={project.base_year} onChange={(e) => setProject({ ...project, base_year: e.target.value })} disabled={formReadOnly} /></div>
              <div className="space-y-2"><Label htmlFor="target_year">Target Year</Label><Input id="target_year" value={project.target_year} onChange={(e) => setProject({ ...project, target_year: e.target.value })} disabled={formReadOnly} /></div>
              <div className="space-y-2"><Label htmlFor="implementation_date">Implementation Date</Label><Input id="implementation_date" type="date" value={project.implementation_date} onChange={(e) => setProject({ ...project, implementation_date: e.target.value })} disabled={formReadOnly} /></div>
              <div className="space-y-2"><Label htmlFor="capex">CAPEX</Label><Input id="capex" value={project.capex} onChange={(e) => setProject({ ...project, capex: e.target.value })} disabled={formReadOnly} /></div>
              <div className="space-y-2"><Label htmlFor="life_span">Life Span</Label><Input id="life_span" value={project.life_span} onChange={(e) => setProject({ ...project, life_span: e.target.value })} disabled={formReadOnly} /></div>
              <div className="space-y-2"><Label htmlFor="method">Method</Label><select id="method" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={project.calculation_method} onChange={(e) => setProject({ ...project, calculation_method: e.target.value as "absolute" | "specific" })} disabled={formReadOnly}><option value="absolute">Absolute</option><option value="specific">Specific</option></select></div>
              <div className="space-y-2"><Label htmlFor="amp_before">AMP Before</Label><Input id="amp_before" type="number" value={project.amp_before} onChange={(e) => setProject({ ...project, amp_before: toNumber(e.target.value) })} disabled={formReadOnly} /></div>
              <div className="space-y-2"><Label htmlFor="amp_after">AMP After</Label><Input id="amp_after" type="number" value={project.amp_after} onChange={(e) => setProject({ ...project, amp_after: toNumber(e.target.value) })} disabled={formReadOnly} /></div>
              <div className="space-y-2"><Label htmlFor="amp_uom">AMP UOM</Label><Input id="amp_uom" value={project.amp_uom} onChange={(e) => setProject({ ...project, amp_uom: e.target.value })} disabled={formReadOnly} /></div>
            </CardContent>
          </Card>

          <Card className="theme-widget-card">
            <CardHeader>
              <CardTitle>Status</CardTitle>
              <CardDescription>Update and review project workflow status history.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[180px_1fr_auto]">
                <select className="h-10 rounded-md border bg-background px-3 text-sm" value={project.status ?? "Planned"} onChange={(e) => setProject({ ...project, status: e.target.value })}>
                  <option>Planned</option>
                  <option>In Progress</option>
                  <option>On Hold</option>
                  <option>Completed</option>
                  <option>Cancelled</option>
                </select>
                <Input placeholder="Comment" value={statusComment} onChange={(e) => setStatusComment(e.target.value)} />
                {canStatusUpdate && <Button variant="outline" onClick={updateStatus}>Update Status</Button>}
              </div>
              {!!statusHistory.length && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Status</TableHead><TableHead>Comment</TableHead><TableHead>Updated By</TableHead><TableHead>Updated At</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {statusHistory.map((row, idx) => (
                        <TableRow key={`${row.updated_at}-${idx}`}>
                          <TableCell>{row.status}</TableCell>
                          <TableCell>{row.comment}</TableCell>
                          <TableCell>{row.updated_by_email}</TableCell>
                          <TableCell>{row.updated_at}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {!statusHistory.length && selectedCode && (
                <EmptyState
                  icon={RefreshCcw}
                  title="No status updates yet"
                  description="This project has not recorded any workflow transitions yet."
                  className="min-h-[170px]"
                />
              )}
            </CardContent>
          </Card>

          <Card className="theme-widget-card">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Input Rows</CardTitle>
                  <CardDescription>Define input-side emissions data.</CardDescription>
                </div>
                <Button variant="outline" onClick={() => setProject((cur) => ({ ...cur, input_data: [...cur.input_data, makeDataRow()] }))} disabled={formReadOnly}><Plus className="mr-2 h-4 w-4" />Add Input Row</Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Material</TableHead><TableHead>UOM</TableHead><TableHead>EF</TableHead><TableHead>Abs Before</TableHead><TableHead>Abs After</TableHead><TableHead>Spec Before</TableHead><TableHead>Spec After</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {project.input_data.map((row, index) => (
                    <TableRow key={`in-${index}`}>
                      <TableCell><Input value={row.material} onChange={(e) => updateDataRow("input_data", index, { material: e.target.value })} disabled={formReadOnly} /></TableCell>
                      <TableCell><Input value={row.uom} onChange={(e) => updateDataRow("input_data", index, { uom: e.target.value })} disabled={formReadOnly} /></TableCell>
                      <TableCell><Input type="number" value={row.ef} onChange={(e) => updateDataRow("input_data", index, { ef: toNumber(e.target.value) })} disabled={formReadOnly} /></TableCell>
                      <TableCell><Input type="number" value={row.abs_before} onChange={(e) => updateDataRow("input_data", index, { abs_before: toNumber(e.target.value) })} disabled={formReadOnly} /></TableCell>
                      <TableCell><Input type="number" value={row.abs_after} onChange={(e) => updateDataRow("input_data", index, { abs_after: toNumber(e.target.value) })} disabled={formReadOnly} /></TableCell>
                      <TableCell><Input type="number" value={row.spec_before} onChange={(e) => updateDataRow("input_data", index, { spec_before: toNumber(e.target.value) })} disabled={formReadOnly} /></TableCell>
                      <TableCell><Input type="number" value={row.spec_after} onChange={(e) => updateDataRow("input_data", index, { spec_after: toNumber(e.target.value) })} disabled={formReadOnly} /></TableCell>
                      <TableCell><Button variant="ghost" size="sm" onClick={() => setProject((cur) => ({ ...cur, input_data: cur.input_data.filter((_, i) => i !== index) }))} disabled={project.input_data.length === 1 || formReadOnly}>Remove</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="theme-widget-card">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Output Rows</CardTitle>
                  <CardDescription>Define output-side emissions data.</CardDescription>
                </div>
                <Button variant="outline" onClick={() => setProject((cur) => ({ ...cur, output_data: [...cur.output_data, makeDataRow()] }))} disabled={formReadOnly}><Plus className="mr-2 h-4 w-4" />Add Output Row</Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Material</TableHead><TableHead>UOM</TableHead><TableHead>EF</TableHead><TableHead>Abs Before</TableHead><TableHead>Abs After</TableHead><TableHead>Spec Before</TableHead><TableHead>Spec After</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {project.output_data.map((row, index) => (
                    <TableRow key={`out-${index}`}>
                      <TableCell><Input value={row.material} onChange={(e) => updateDataRow("output_data", index, { material: e.target.value })} disabled={formReadOnly} /></TableCell>
                      <TableCell><Input value={row.uom} onChange={(e) => updateDataRow("output_data", index, { uom: e.target.value })} disabled={formReadOnly} /></TableCell>
                      <TableCell><Input type="number" value={row.ef} onChange={(e) => updateDataRow("output_data", index, { ef: toNumber(e.target.value) })} disabled={formReadOnly} /></TableCell>
                      <TableCell><Input type="number" value={row.abs_before} onChange={(e) => updateDataRow("output_data", index, { abs_before: toNumber(e.target.value) })} disabled={formReadOnly} /></TableCell>
                      <TableCell><Input type="number" value={row.abs_after} onChange={(e) => updateDataRow("output_data", index, { abs_after: toNumber(e.target.value) })} disabled={formReadOnly} /></TableCell>
                      <TableCell><Input type="number" value={row.spec_before} onChange={(e) => updateDataRow("output_data", index, { spec_before: toNumber(e.target.value) })} disabled={formReadOnly} /></TableCell>
                      <TableCell><Input type="number" value={row.spec_after} onChange={(e) => updateDataRow("output_data", index, { spec_after: toNumber(e.target.value) })} disabled={formReadOnly} /></TableCell>
                      <TableCell><Button variant="ghost" size="sm" onClick={() => setProject((cur) => ({ ...cur, output_data: cur.output_data.filter((_, i) => i !== index) }))} disabled={project.output_data.length === 1 || formReadOnly}>Remove</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="theme-widget-card">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Costing Rows</CardTitle>
                  <CardDescription>Capture cost deltas for the project.</CardDescription>
                </div>
                <Button variant="outline" onClick={() => setProject((cur) => ({ ...cur, costing_data: [...cur.costing_data, makeCostRow()] }))} disabled={formReadOnly}><Plus className="mr-2 h-4 w-4" />Add Cost Row</Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Parameter</TableHead><TableHead>UOM</TableHead><TableHead>Before</TableHead><TableHead>After</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {project.costing_data.map((row, index) => (
                    <TableRow key={`cost-${index}`}>
                      <TableCell><Input value={row.parameter} onChange={(e) => updateCostRow(index, { parameter: e.target.value })} disabled={formReadOnly} /></TableCell>
                      <TableCell><Input value={row.uom} onChange={(e) => updateCostRow(index, { uom: e.target.value })} disabled={formReadOnly} /></TableCell>
                      <TableCell><Input type="number" value={row.before} onChange={(e) => updateCostRow(index, { before: toNumber(e.target.value) })} disabled={formReadOnly} /></TableCell>
                      <TableCell><Input type="number" value={row.after} onChange={(e) => updateCostRow(index, { after: toNumber(e.target.value) })} disabled={formReadOnly} /></TableCell>
                      <TableCell><Button variant="ghost" size="sm" onClick={() => setProject((cur) => ({ ...cur, costing_data: cur.costing_data.filter((_, i) => i !== index) }))} disabled={project.costing_data.length <= 1 || formReadOnly}>Remove</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {calcResult && (
            <Card className="theme-widget-card">
              <CardHeader>
                <CardTitle>Calculation Results</CardTitle>
                <CardDescription>Current emission and costing outputs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard label="Net CO2 Before" value={Number(calcResult.emission_results["Net CO2_Before"] ?? 0).toFixed(4)} />
                  <MetricCard label="Net CO2 After" value={Number(calcResult.emission_results["Net CO2_After"] ?? 0).toFixed(4)} />
                  <MetricCard label="CO2 Reduction" value={Number(calcResult.emission_results["CO2 reduction_Net"] ?? 0).toFixed(4)} />
                  <MetricCard label="Specific Net" value={Number(calcResult.emission_results["Sp.Net_Net"] ?? 0).toFixed(4)} />
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Metric</TableHead><TableHead>Value</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {Object.entries(calcResult.emission_results).map(([key, value]) => (
                        <TableRow key={key}><TableCell>{key}</TableCell><TableCell>{Number(value).toFixed(4)}</TableCell></TableRow>
                      ))}
                      {Object.entries(calcResult.costing_results).map(([key, value]) => (
                        <TableRow key={key}><TableCell>{key}</TableCell><TableCell>{Number(value).toFixed(4)}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="theme-widget-card">
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Tracking</CardTitle>
                  <CardDescription>Load and save actual annual tracking data.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Input type="number" min={1} value={trackingYear} onChange={(e) => setTrackingYear(clampPositiveInt(e.target.value))} className="w-[120px]" />
                  <Button variant="outline" onClick={loadTrackingYear}>Load Year</Button>
                  {canTrackingSave && <Button onClick={saveTrackingYear} disabled={savingTracking}>{savingTracking ? "Saving..." : "Save Year"}</Button>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">Known years: {trackingYears.join(", ") || "none"}</div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2"><Label htmlFor="amp_value">AMP Value</Label><Input id="amp_value" type="number" value={trackingState.amp_value ?? ""} onChange={(e) => setTrackingState((cur) => ({ ...cur, amp_value: e.target.value === "" ? null : toNumber(e.target.value) }))} disabled={!canTrackingSave} /></div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Section</TableHead><TableHead>Material</TableHead><TableHead>Row</TableHead><TableHead>Absolute</TableHead><TableHead>Specific</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {trackingState.input_rows.map((row, index) => (
                      <TableRow key={`track-in-${index}`}>
                        <TableCell>Input</TableCell>
                        <TableCell>{row.material_name}</TableCell>
                        <TableCell>{row.row_index}</TableCell>
                        <TableCell><Input type="number" value={row.absolute_value ?? ""} onChange={(e) => updateTrackingRow("input_rows", index, { absolute_value: e.target.value === "" ? null : toNumber(e.target.value) })} disabled={!canTrackingSave} /></TableCell>
                        <TableCell><Input type="number" value={row.specific_value ?? ""} onChange={(e) => updateTrackingRow("input_rows", index, { specific_value: e.target.value === "" ? null : toNumber(e.target.value) })} disabled={!canTrackingSave} /></TableCell>
                      </TableRow>
                    ))}
                    {trackingState.output_rows.map((row, index) => (
                      <TableRow key={`track-out-${index}`}>
                        <TableCell>Output</TableCell>
                        <TableCell>{row.material_name}</TableCell>
                        <TableCell>{row.row_index}</TableCell>
                        <TableCell><Input type="number" value={row.absolute_value ?? ""} onChange={(e) => updateTrackingRow("output_rows", index, { absolute_value: e.target.value === "" ? null : toNumber(e.target.value) })} disabled={!canTrackingSave} /></TableCell>
                        <TableCell><Input type="number" value={row.specific_value ?? ""} onChange={(e) => updateTrackingRow("output_rows", index, { specific_value: e.target.value === "" ? null : toNumber(e.target.value) })} disabled={!canTrackingSave} /></TableCell>
                      </TableRow>
                    ))}
                    {!trackingState.input_rows.length && !trackingState.output_rows.length && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Load a year to view tracking rows.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {trends && (
        <div className={pageLayout.chartGrid}>
          <Card className="theme-widget-card">
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Emission Trend (Absolute)</CardTitle>
                  <CardDescription>Visualize previous, target, and actual absolute values.</CardDescription>
                </div>
                <select className="h-10 rounded-md border bg-background px-3 text-sm" value={absoluteTrendChartType} onChange={(e) => setAbsoluteTrendChartType(e.target.value as TrendChartType)}>
                  <option value="bar">Bar</option>
                  <option value="line">Line</option>
                  <option value="area">Area</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>{renderTrendChart(trends.absolute_trend, absoluteTrendChartType, CHART_TOKEN_COLORS[5])}</CardContent>
          </Card>

          <Card className="theme-widget-card">
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Emission Trend (Specific)</CardTitle>
                  <CardDescription>Visualize previous, target, and actual specific values.</CardDescription>
                </div>
                <select className="h-10 rounded-md border bg-background px-3 text-sm" value={specificTrendChartType} onChange={(e) => setSpecificTrendChartType(e.target.value as TrendChartType)}>
                  <option value="bar">Bar</option>
                  <option value="line">Line</option>
                  <option value="area">Area</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>{renderTrendChart(trends.specific_trend, specificTrendChartType, CHART_TOKEN_COLORS[2])}</CardContent>
          </Card>
        </div>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete CO₂ project?</AlertDialogTitle>
            <AlertDialogDescription>This removes the project, tracking data, and status history references.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(event) => {
              event.preventDefault();
              void deleteProject();
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
