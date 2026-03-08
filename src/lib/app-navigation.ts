import {
  BarChart3,
  Flame,
  LayoutDashboard,
  Lightbulb,
  TrendingDown,
  User,
  type LucideIcon,
} from "lucide-react";

export type AppNavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  module: string;
};

export const MAIN_NAV_ITEMS: AppNavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, module: "dashboard" },
  { title: "CO2 Emissions", url: "/co2", icon: BarChart3, module: "co2" },
  { title: "Fuel & Energy", url: "/fuel-energy", icon: Flame, module: "fuel" },
  { title: "MACC", url: "/macc", icon: TrendingDown, module: "macc" },
  { title: "Strategies", url: "/strategies", icon: Lightbulb, module: "strategy" },
];

export const UTILITY_NAV_ITEMS: AppNavItem[] = [
  { title: "Profile", url: "/profile", icon: User, module: "profile" },
];
