export type Scope = "Scope 1" | "Scope 2" | "Scope 3";

export interface FuelBaselineRow {
  scope: Scope;
  name: string;
  uom: string;
  quantity: number;
  ef: number;
  emission: number;
  energy_factor: number;
  energy_uom: string;
  energy: number;
}

export interface FuelCalculation {
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
  materials_baseline: FuelBaselineRow[];
  reductions: Record<Scope, number>;
  base_emissions?: Record<string, number>;
}

export interface Co2DataRow {
  material: string;
  uom: string;
  ef: number;
  abs_before: number;
  abs_after: number;
  spec_before: number;
  spec_after: number;
}

export interface Co2CostRow {
  parameter: string;
  uom: string;
  before: number;
  after: number;
}

export interface Co2Project {
  project_code: string;
  organization: string;
  entity_name: string;
  unit_name: string;
  project_name: string;
  base_year: string;
  target_year: string;
  implementation_date: string;
  capex: string;
  life_span: string;
  project_owner: string;
  input_data: Co2DataRow[];
  output_data: Co2DataRow[];
  costing_data: Co2CostRow[];
  amp_before: number;
  amp_after: number;
  amp_uom: string;
  calculation_method: "absolute" | "specific";
  status?: string;
  emission_results?: Record<string, number>;
  costing_results?: Record<string, number>;
}

export interface MaccProject {
  id: string;
  organization: string;
  entity_name: string;
  unit_name: string;
  project_name: string;
  base_year: string;
  target_year: string;
  implementation_date: string;
  life_span: string;
  project_owner: string;
  initiative: string;
  industry: string;
  country: string;
  year: string;
  material_energy_data: Record<string, unknown>;
  option1_data: Record<string, unknown>;
  option2_data: Record<string, unknown>;
  result: Record<string, unknown>;
  npv1: number;
  npv2: number;
  mac: number;
  total_co2_diff: number;
}

export interface StrategyPortfolio {
  id: string;
  name: string;
  organization: string;
  sector: string;
  baseline_calc_id: string;
  selected_macc_projects: string[];
}
