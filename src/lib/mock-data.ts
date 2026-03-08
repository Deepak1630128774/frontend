// Mock data for charts and tables

export const co2MonthlyData = [
  { month: "Jan", emissions: 4200, intensity: 0.42, target: 4000 },
  { month: "Feb", emissions: 3900, intensity: 0.39, target: 3900 },
  { month: "Mar", emissions: 4100, intensity: 0.41, target: 3800 },
  { month: "Apr", emissions: 3700, intensity: 0.37, target: 3700 },
  { month: "May", emissions: 3500, intensity: 0.35, target: 3600 },
  { month: "Jun", emissions: 3800, intensity: 0.38, target: 3500 },
  { month: "Jul", emissions: 4000, intensity: 0.40, target: 3400 },
  { month: "Aug", emissions: 3600, intensity: 0.36, target: 3300 },
  { month: "Sep", emissions: 3400, intensity: 0.34, target: 3200 },
  { month: "Oct", emissions: 3200, intensity: 0.32, target: 3100 },
  { month: "Nov", emissions: 3000, intensity: 0.30, target: 3000 },
  { month: "Dec", emissions: 2800, intensity: 0.28, target: 2900 },
];

export const co2BySector = [
  { sector: "Power Gen", value: 12400 },
  { sector: "Transport", value: 8200 },
  { sector: "Industrial", value: 6800 },
  { sector: "Residential", value: 4100 },
  { sector: "Agriculture", value: 2900 },
];

export const fuelData = [
  { month: "Jan", coal: 3200, gas: 2800, oil: 1900, renewables: 1200 },
  { month: "Feb", coal: 3000, gas: 2700, oil: 1800, renewables: 1300 },
  { month: "Mar", coal: 3100, gas: 2900, oil: 1850, renewables: 1400 },
  { month: "Apr", coal: 2800, gas: 2600, oil: 1700, renewables: 1500 },
  { month: "May", coal: 2600, gas: 2400, oil: 1600, renewables: 1700 },
  { month: "Jun", coal: 2700, gas: 2500, oil: 1650, renewables: 1800 },
  { month: "Jul", coal: 2900, gas: 2700, oil: 1750, renewables: 1600 },
  { month: "Aug", coal: 2500, gas: 2300, oil: 1550, renewables: 1900 },
  { month: "Sep", coal: 2400, gas: 2200, oil: 1500, renewables: 2000 },
  { month: "Oct", coal: 2200, gas: 2100, oil: 1400, renewables: 2100 },
  { month: "Nov", coal: 2100, gas: 2000, oil: 1350, renewables: 2200 },
  { month: "Dec", coal: 1900, gas: 1900, oil: 1300, renewables: 2400 },
];

export const maccData = [
  { measure: "LED Lighting", cost: -50, abatement: 120 },
  { measure: "Building Insulation", cost: -30, abatement: 200 },
  { measure: "Efficient HVAC", cost: -10, abatement: 150 },
  { measure: "Solar PV", cost: 5, abatement: 400 },
  { measure: "Wind Power", cost: 15, abatement: 350 },
  { measure: "Heat Pumps", cost: 25, abatement: 180 },
  { measure: "EV Fleet", cost: 40, abatement: 280 },
  { measure: "Green Hydrogen", cost: 80, abatement: 220 },
  { measure: "CCS", cost: 120, abatement: 500 },
  { measure: "DAC", cost: 200, abatement: 100 },
];

export const strategies = [
  { id: "1", name: "Net Zero 2050", owner: "Jane Smith", status: "active" as const, created: "2025-11-15", reduction: 42 },
  { id: "2", name: "Renewables First", owner: "John Doe", status: "draft" as const, created: "2025-12-01", reduction: 28 },
  { id: "3", name: "Efficiency Drive", owner: "Jane Smith", status: "completed" as const, created: "2025-10-20", reduction: 35 },
  { id: "4", name: "Carbon Offset Mix", owner: "Alex Chen", status: "active" as const, created: "2026-01-10", reduction: 18 },
  { id: "5", name: "Electrification Push", owner: "Maria Lopez", status: "draft" as const, created: "2026-02-05", reduction: 31 },
];

export const users = [
  { id: "1", name: "Jane Smith", email: "jane@energycorp.com", role: "admin" as const, lastLogin: "2026-03-01" },
  { id: "2", name: "John Doe", email: "john@energycorp.com", role: "manager" as const, lastLogin: "2026-02-28" },
  { id: "3", name: "Alex Chen", email: "alex@energycorp.com", role: "analyst" as const, lastLogin: "2026-03-02" },
  { id: "4", name: "Maria Lopez", email: "maria@energycorp.com", role: "analyst" as const, lastLogin: "2026-02-25" },
  { id: "5", name: "David Kim", email: "david@energycorp.com", role: "manager" as const, lastLogin: "2026-02-20" },
];

export const kpis = {
  totalEmissions: { value: 42100, unit: "tCO₂e", change: -8.2 },
  avgIntensity: { value: 0.35, unit: "tCO₂e/MWh", change: -5.1 },
  renewableShare: { value: 34, unit: "%", change: 12.4 },
  strategiesActive: { value: 2, unit: "", change: 0 },
};
