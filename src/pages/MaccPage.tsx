import { CHART_TOKEN_COLORS } from "@/lib/chart-theme";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/auth";
import type { MaccProject } from "@/types";
import { api } from "@/api/client";
import { useAppVariantSystem } from "@/components/app-shell/AppVariantProvider";
import { EmptyState, InlineStatus, PageLoadingState } from "@/components/state-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";

type ChartType = "bar" | "line" | "area";
type JsxCompatComponent = (props: Record<string, unknown>) => JSX.Element | null;

const RechartsXAxis = XAxis as unknown as JsxCompatComponent;
const RechartsYAxis = YAxis as unknown as JsxCompatComponent;
const RechartsTooltip = Tooltip as unknown as JsxCompatComponent;
const RechartsLine = Line as unknown as JsxCompatComponent;
const RechartsArea = Area as unknown as JsxCompatComponent;
const RechartsBar = Bar as unknown as JsxCompatComponent;
const MACC_CHART_COLORS = [CHART_TOKEN_COLORS[5], CHART_TOKEN_COLORS[2], CHART_TOKEN_COLORS[3]];

interface MaccListItem {
  id: string;
  organization: string;
  project_name: string;
  target_year: string;
  mac: number;
  total_co2_diff: number;
}

function makeMaccProject(defaultOrganization = ""): MaccProject {
  const year = new Date().getFullYear();
  return {
    id: `MACC-${Date.now()}`,
    organization: defaultOrganization,
    entity_name: "",
    unit_name: "",
    project_name: "",
    base_year: `${year}`,
    target_year: `${year + 5}`,
    implementation_date: `${year}-01-01`,
    life_span: "10",
    project_owner: "",
    initiative: "",
    industry: "",
    country: "",
    year: `${year}`,
    material_energy_data: {},
    option1_data: {},
    option2_data: {},
    result: {},
    npv1: 0,
    npv2: 0,
    mac: 0,
    total_co2_diff: 0,
  };
}

function parseCashflows(input: string): number[] {
  return input
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function MetricCard({ label, value, themed = false }: { label: string; value: string; themed?: boolean }) {
  return (
    <div className={cn("rounded-lg border bg-muted/20 p-4", themed && "theme-data-card") }>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

export default function MaccPage() {
  const { token, can, hasOrganizationDataScope, requiresOrganizationSelection, selectedOrganizationId, selectedOrganizationName, user } = useAuth();
  const { activeAppVariant } = useAppVariantSystem();
  const isCommandExperience = activeAppVariant === "command";
  const scopedOrganizationName = (selectedOrganizationName || user?.organization_name || "").trim();
  const organizationLocked = Boolean(scopedOrganizationName);

  const [items, setItems] = useState([] as MaccListItem[]);
  const [selectedId, setSelectedId] = useState("");
  const [project, setProject] = useState(makeMaccProject(scopedOrganizationName) as MaccProject);
  const [option1Discount, setOption1Discount] = useState(8);
  const [option2Discount, setOption2Discount] = useState(8);
  const [option1CashflowText, setOption1CashflowText] = useState("0,-100000,10000,10000,10000");
  const [option2CashflowText, setOption2CashflowText] = useState("0,-125000,12000,12000,12000");
  const [result, setResult] = useState(null as { npv1: number; npv2: number; mac: number | null } | null);
  const [listSearch, setListSearch] = useState("");
  const [listPage, setListPage] = useState(1);
  const [maccChartType, setMaccChartType] = useState("bar" as ChartType);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canCreate = can("macc", "create");
  const canSave = selectedId ? can("macc", "save", { projectId: selectedId }) : can("macc", "create");
  const canDelete = selectedId ? can("macc", "delete", { projectId: selectedId }) : false;
  const formReadOnly = !canSave && Boolean(selectedId);

  const option1Cashflows = useMemo(() => parseCashflows(option1CashflowText), [option1CashflowText]);
  const option2Cashflows = useMemo(() => parseCashflows(option2CashflowText), [option2CashflowText]);
  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const text = `${item.id} ${item.project_name} ${item.organization}`.toLowerCase();
        return text.includes(listSearch.toLowerCase());
      }),
    [items, listSearch],
  );
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const pagedItems = filteredItems.slice((listPage - 1) * pageSize, listPage * pageSize);
  const actionState = evaluating || saving ? "loading" : message ? "success" : "idle";
  const actionLabel = evaluating ? "Evaluating MACC" : saving ? "Saving MACC project" : message;
  const chartRows = result
    ? [
        { label: "NPV Option 1", value: result.npv1 },
        { label: "NPV Option 2", value: result.npv2 },
        { label: "MAC", value: Number(result.mac ?? 0) },
      ]
    : [];

  const loadList = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    if (requiresOrganizationSelection && !hasOrganizationDataScope) {
      setItems([]);
      setSelectedId("");
      setProject(makeMaccProject(scopedOrganizationName));
      setResult(null);
      setLoading(false);
      setError("");
      setMessage("");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const rows = await api.get<MaccListItem[]>("/api/macc/projects", token);
      setItems(rows ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load MACC projects");
    } finally {
      setLoading(false);
    }
  }, [hasOrganizationDataScope, requiresOrganizationSelection, selectedOrganizationId, token]);

  const scopeBadgeLabel = user?.role === "owner" || user?.role === "super_admin"
    ? (selectedOrganizationName ? `Scoped to ${selectedOrganizationName}` : "Platform governance scope")
    : `Workspace ${selectedOrganizationName || user?.organization_name || "Organization workspace"}`;

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    setSelectedId("");
    setProject(makeMaccProject(scopedOrganizationName));
    setResult(null);
    setMessage("");
    setError("");
  }, [scopedOrganizationName, selectedOrganizationId]);

  useEffect(() => {
    if (listPage > totalPages) {
      setListPage(totalPages);
    }
  }, [listPage, totalPages]);

  async function selectProject(id: string) {
    if (!token) return;
    try {
      setError("");
      setMessage("");
      const data = await api.get<MaccProject>(`/api/macc/projects/${id}`, token);
      setSelectedId(id);
      setProject(data);

      const opt1 = (data.option1_data?.cashflows as number[] | undefined) ?? [];
      const opt2 = (data.option2_data?.cashflows as number[] | undefined) ?? [];
      const d1 = Number((data.option1_data?.discount_rate as number | undefined) ?? 8);
      const d2 = Number((data.option2_data?.discount_rate as number | undefined) ?? 8);

      setOption1CashflowText(opt1.length ? opt1.join(",") : "");
      setOption2CashflowText(opt2.length ? opt2.join(",") : "");
      setOption1Discount(d1);
      setOption2Discount(d2);
      setResult({ npv1: data.npv1, npv2: data.npv2, mac: data.mac });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load MACC project");
    }
  }

  function resetProject() {
    setSelectedId("");
    setProject(makeMaccProject(scopedOrganizationName));
    setOption1Discount(8);
    setOption2Discount(8);
    setOption1CashflowText("0,-100000,10000,10000,10000");
    setOption2CashflowText("0,-125000,12000,12000,12000");
    setResult(null);
    setMessage("");
    setError("");
  }

  async function evaluate() {
    if (!token) return;
    try {
      setEvaluating(true);
      setError("");
      const response = await api.post<{ npv1: number; npv2: number; mac: number | null }>(
        "/api/macc/evaluate",
        {
          option1_discount_rate: option1Discount,
          option1_cashflows: option1Cashflows,
          option2_discount_rate: option2Discount,
          option2_cashflows: option2Cashflows,
          total_co2_diff: project.total_co2_diff,
        },
        token,
      );
      setResult(response);
      setProject((current) => ({
        ...current,
        npv1: response.npv1,
        npv2: response.npv2,
        mac: Number(response.mac ?? 0),
      }));
      setMessage("MACC evaluation complete.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to evaluate MACC project");
    } finally {
      setEvaluating(false);
    }
  }

  async function saveProject() {
    if (!token) return;
    try {
      setSaving(true);
      setError("");
      await api.post(
        "/api/macc/projects",
        {
          ...project,
          organization: scopedOrganizationName || project.organization,
          option1_data: {
            discount_rate: option1Discount,
            cashflows: option1Cashflows,
          },
          option2_data: {
            discount_rate: option2Discount,
            cashflows: option2Cashflows,
          },
          result: {
            npv1: project.npv1,
            npv2: project.npv2,
            mac: project.mac,
          },
        },
        token,
      );
      setSelectedId(project.id);
      setMessage("MACC project saved.");
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save MACC project");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject() {
    if (!token || !selectedId) {
      setError("Select a MACC project to delete.");
      return;
    }
    try {
      setError("");
      await api.del(`/api/macc/projects/${selectedId}`, token);
      setDeleteOpen(false);
      resetProject();
      setMessage("MACC project deleted.");
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete MACC project");
    }
  }

  function renderChart() {
    if (!chartRows.length) {
      return (
        <EmptyState
          icon={BarChart3}
          title="No evaluation results yet"
          description="Run an evaluation to compare both option cashflows and calculate the marginal abatement cost." 
          className="min-h-[280px]"
        />
      );
    }

    if (maccChartType === "line") {
      return (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartRows}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <RechartsXAxis dataKey="label" tick={{ fontSize: 12 }} />
            <RechartsYAxis tick={{ fontSize: 12 }} />
            <RechartsTooltip />
            <RechartsLine type="monotone" dataKey="value" stroke={CHART_TOKEN_COLORS[5]} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (maccChartType === "area") {
      return (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartRows}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <RechartsXAxis dataKey="label" tick={{ fontSize: 12 }} />
            <RechartsYAxis tick={{ fontSize: 12 }} />
            <RechartsTooltip />
            <RechartsArea type="monotone" dataKey="value" stroke={CHART_TOKEN_COLORS[5]} fill={CHART_TOKEN_COLORS[5]} fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartRows}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <RechartsXAxis dataKey="label" tick={{ fontSize: 12 }} />
          <RechartsYAxis tick={{ fontSize: 12 }} />
          <RechartsTooltip />
          <RechartsBar dataKey="value">
            {chartRows.map((_, index) => (
              <Cell key={`macc-${index}`} fill={MACC_CHART_COLORS[index % MACC_CHART_COLORS.length]} />
            ))}
          </RechartsBar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (loading) {
    return <PageLoadingState title="Loading MACC projects" description="Preparing saved projects, financial assumptions, and result history for evaluation." />;
  }

  if (requiresOrganizationSelection && !hasOrganizationDataScope) {
    return (
      <EmptyState
        title="Select an organization"
        description="Choose an organization from the sidebar before loading MACC projects or evaluations."
        icon={BarChart3}
      />
    );
  }

  return (
    <div className={cn("min-w-0 w-full space-y-6", isCommandExperience && "command-macc-page") }>
      <div className="theme-floating-panel theme-hero-panel p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{scopeBadgeLabel}</Badge>
          </div>
          <h1 className="text-3xl font-bold">MACC Analysis</h1>
          <p className="mt-1 text-muted-foreground">Project finance setup and marginal abatement cost evaluation.</p>
          </div>
          <div className="flex flex-wrap gap-2">
          {canCreate && <Button variant="outline" onClick={resetProject}><Plus className="mr-2 h-4 w-4" />New Project</Button>}
          <Button variant="outline" onClick={() => void loadList()}><RefreshCcw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button variant="secondary" onClick={evaluate} disabled={evaluating}><Calculator className="mr-2 h-4 w-4" />{evaluating ? "Evaluating..." : "Evaluate"}</Button>
          {canSave && <Button onClick={saveProject} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "Saving..." : "Save"}</Button>}
          {canDelete && <Button variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="outline">{filteredItems.length} projects</Badge>
          {selectedId && <Badge variant="outline">Selected {selectedId}</Badge>}
          {listSearch && <Badge variant="outline">Filter {listSearch}</Badge>}
          {result ? <Badge variant="outline">Evaluation ready</Badge> : null}
          <InlineStatus state={actionState} label={actionLabel ?? ""} className="ml-auto" />
        </div>
      </div>

      {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
      {message && <Alert><AlertDescription>{message}</AlertDescription></Alert>}

      <div className="grid min-w-0 gap-6 xl:grid-cols-4">
        <Card className={cn("xl:col-span-1", isCommandExperience && "theme-widget-card")}>
          <CardHeader>
            <CardTitle>Saved MACC Projects</CardTitle>
            <CardDescription>Select a project to edit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search projects..." value={listSearch} onChange={(e) => { setListSearch(e.target.value); setListPage(1); }} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Page {listPage} of {totalPages}</Badge>
              <Badge variant="outline">{items.length} total</Badge>
              {listSearch ? <Badge variant="outline">Search active</Badge> : null}
            </div>
            <div className="space-y-2">
              {pagedItems.map((item) => (
                <button key={item.id} type="button" className={`theme-selectable-card ${selectedId === item.id ? "theme-selectable-card-active" : ""}`} onClick={() => void selectProject(item.id)}>
                  <div className="font-medium">{item.project_name || item.id}</div>
                  <div className="text-sm text-muted-foreground">{item.organization || "Unknown organization"}</div>
                  <div className="text-xs text-muted-foreground">MAC {Number(item.mac ?? 0).toFixed(2)} · CO₂ {Number(item.total_co2_diff ?? 0).toFixed(2)}</div>
                </button>
              ))}
              {!pagedItems.length && (
                <EmptyState
                  icon={Search}
                  title={listSearch ? "No matching MACC projects" : "No MACC projects yet"}
                  description={listSearch ? "Clear the filter or try another keyword to find saved MACC projects." : "Create a project to compare discount rates, cashflows, and abatement economics."}
                  actionLabel={!listSearch && canCreate ? "Create project" : undefined}
                  onAction={!listSearch && canCreate ? resetProject : undefined}
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

        <div className="min-w-0 space-y-6 xl:col-span-3">
          <Card className={cn(isCommandExperience && "theme-widget-card")}>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
              <CardDescription>Core project information for MACC evaluation.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2"><Label htmlFor="id">Project ID</Label><Input id="id" value={project.id} onChange={(e) => setProject({ ...project, id: e.target.value })} disabled={formReadOnly} /></div>
              <div className="space-y-2"><Label htmlFor="project_name">Project Name</Label><Input id="project_name" value={project.project_name} onChange={(e) => setProject({ ...project, project_name: e.target.value })} disabled={formReadOnly} /></div>
              <div className="space-y-2"><Label htmlFor="organization">Organization</Label><Input id="organization" value={project.organization} onChange={(e) => setProject({ ...project, organization: e.target.value })} disabled={formReadOnly || organizationLocked} /></div>
              <div className="space-y-2"><Label htmlFor="entity_name">Entity</Label><Input id="entity_name" value={project.entity_name} onChange={(e) => setProject({ ...project, entity_name: e.target.value })} disabled={formReadOnly} /></div>
              <div className="space-y-2"><Label htmlFor="unit_name">Unit</Label><Input id="unit_name" value={project.unit_name} onChange={(e) => setProject({ ...project, unit_name: e.target.value })} disabled={formReadOnly} /></div>
              <div className="space-y-2"><Label htmlFor="project_owner">Owner</Label><Input id="project_owner" value={project.project_owner} onChange={(e) => setProject({ ...project, project_owner: e.target.value })} disabled={formReadOnly} /></div>
              <div className="space-y-2"><Label htmlFor="base_year">Base Year</Label><Input id="base_year" value={project.base_year} onChange={(e) => setProject({ ...project, base_year: e.target.value })} disabled={formReadOnly} /></div>
              <div className="space-y-2"><Label htmlFor="target_year">Target Year</Label><Input id="target_year" value={project.target_year} onChange={(e) => setProject({ ...project, target_year: e.target.value })} disabled={formReadOnly} /></div>
              <div className="space-y-2"><Label htmlFor="implementation_date">Implementation Date</Label><Input id="implementation_date" type="date" value={project.implementation_date} onChange={(e) => setProject({ ...project, implementation_date: e.target.value })} disabled={formReadOnly} /></div>
              <div className="space-y-2"><Label htmlFor="life_span">Life Span</Label><Input id="life_span" value={project.life_span} onChange={(e) => setProject({ ...project, life_span: e.target.value })} disabled={formReadOnly} /></div>
              <div className="space-y-2"><Label htmlFor="initiative">Initiative</Label><Input id="initiative" value={project.initiative} onChange={(e) => setProject({ ...project, initiative: e.target.value })} disabled={formReadOnly} /></div>
              <div className="space-y-2"><Label htmlFor="industry">Industry</Label><Input id="industry" value={project.industry} onChange={(e) => setProject({ ...project, industry: e.target.value })} disabled={formReadOnly} /></div>
              <div className="space-y-2"><Label htmlFor="country">Country</Label><Input id="country" value={project.country} onChange={(e) => setProject({ ...project, country: e.target.value })} disabled={formReadOnly} /></div>
              <div className="space-y-2"><Label htmlFor="year">Year</Label><Input id="year" value={project.year} onChange={(e) => setProject({ ...project, year: e.target.value })} disabled={formReadOnly} /></div>
              <div className="space-y-2"><Label htmlFor="co2_diff">Total CO₂ Difference</Label><Input id="co2_diff" type="number" value={project.total_co2_diff} onChange={(e) => setProject({ ...project, total_co2_diff: toNumber(e.target.value) })} disabled={formReadOnly} /></div>
            </CardContent>
          </Card>

          <div className="grid min-w-0 gap-6 xl:grid-cols-2">
            <Card className={cn(isCommandExperience && "theme-widget-card")}>
              <CardHeader>
                <CardTitle>Option 1</CardTitle>
                <CardDescription>Discount rate and cashflows for the baseline option.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label htmlFor="option1Discount">Discount Rate (%)</Label><Input id="option1Discount" type="number" value={option1Discount} onChange={(e) => setOption1Discount(toNumber(e.target.value))} disabled={formReadOnly} /></div>
                <div className="space-y-2"><Label htmlFor="option1CashflowText">Cashflows</Label><Textarea id="option1CashflowText" value={option1CashflowText} onChange={(e) => setOption1CashflowText(e.target.value)} disabled={formReadOnly} rows={6} /></div>
              </CardContent>
            </Card>

            <Card className={cn(isCommandExperience && "theme-widget-card")}>
              <CardHeader>
                <CardTitle>Option 2</CardTitle>
                <CardDescription>Discount rate and cashflows for the alternative option.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label htmlFor="option2Discount">Discount Rate (%)</Label><Input id="option2Discount" type="number" value={option2Discount} onChange={(e) => setOption2Discount(toNumber(e.target.value))} disabled={formReadOnly} /></div>
                <div className="space-y-2"><Label htmlFor="option2CashflowText">Cashflows</Label><Textarea id="option2CashflowText" value={option2CashflowText} onChange={(e) => setOption2CashflowText(e.target.value)} disabled={formReadOnly} rows={6} /></div>
              </CardContent>
            </Card>
          </div>

          {result ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="NPV Option 1" value={result.npv1.toFixed(2)} themed={isCommandExperience} />
                <MetricCard label="NPV Option 2" value={result.npv2.toFixed(2)} themed={isCommandExperience} />
                <MetricCard label="MAC" value={Number(result.mac ?? 0).toFixed(2)} themed={isCommandExperience} />
                <MetricCard label="CO₂ Diff" value={project.total_co2_diff.toFixed(2)} themed={isCommandExperience} />
              </div>

              <Card className={cn(isCommandExperience && "theme-widget-card")}>
                <CardHeader>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle>MACC Evaluation</CardTitle>
                      <CardDescription>Compare option NPVs and marginal abatement cost.</CardDescription>
                    </div>
                    <select className="h-10 rounded-md border bg-background px-3 text-sm" value={maccChartType} onChange={(e) => setMaccChartType(e.target.value as ChartType)}>
                      <option value="bar">Bar</option>
                      <option value="line">Line</option>
                      <option value="area">Area</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent>{renderChart()}</CardContent>
              </Card>
            </>
          ) : (
            <Card className={cn(isCommandExperience && "theme-widget-card")}>
              <CardHeader>
                <CardTitle>MACC Evaluation</CardTitle>
                <CardDescription>Compare option NPVs and marginal abatement cost.</CardDescription>
              </CardHeader>
              <CardContent>{renderChart()}</CardContent>
            </Card>
          )}
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete MACC project?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(event) => { event.preventDefault(); void deleteProject(); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
