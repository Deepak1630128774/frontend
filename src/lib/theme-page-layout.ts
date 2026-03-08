import type { ThemeProfile } from "@/lib/theme-system";
import type { AppVariantId } from "@/lib/app/app-variant-types";

type WorkspacePageLayout = {
  shellGrid: string;
  listRailClass: string;
  contentClass: string;
  detailStackClass: string;
  summaryGrid: string;
  analysisGrid: string;
  chartGrid: string;
  heroTitleAlign: string;
  heroBodyAlign: string;
};

const WORKSPACE_LAYOUTS: Record<ThemeProfile["layout"]["dashboard"], WorkspacePageLayout> = {
  balanced: {
    shellGrid: "grid gap-6 xl:grid-cols-4",
    listRailClass: "xl:col-span-1",
    contentClass: "xl:col-span-3",
    detailStackClass: "space-y-6",
    summaryGrid: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4",
    analysisGrid: "grid gap-6 xl:grid-cols-2",
    chartGrid: "grid gap-6 xl:grid-cols-2",
    heroTitleAlign: "text-left",
    heroBodyAlign: "items-start",
  },
  open: {
    shellGrid: "grid gap-6 2xl:grid-cols-[0.9fr_1.1fr]",
    listRailClass: "2xl:col-span-1",
    contentClass: "2xl:col-span-1",
    detailStackClass: "space-y-6",
    summaryGrid: "grid gap-4 sm:grid-cols-2 xl:grid-cols-4",
    analysisGrid: "grid gap-6 2xl:grid-cols-[1.05fr_0.95fr]",
    chartGrid: "grid gap-6 2xl:grid-cols-[1fr_1fr]",
    heroTitleAlign: "text-left",
    heroBodyAlign: "items-start",
  },
  spotlight: {
    shellGrid: "grid gap-6 2xl:grid-cols-[0.85fr_1.15fr]",
    listRailClass: "2xl:col-span-1",
    contentClass: "2xl:col-span-1",
    detailStackClass: "space-y-6",
    summaryGrid: "grid gap-3 md:grid-cols-2 xl:grid-cols-4",
    analysisGrid: "grid gap-6 2xl:grid-cols-[1.2fr_0.8fr]",
    chartGrid: "grid gap-6 2xl:grid-cols-[1.2fr_0.8fr]",
    heroTitleAlign: "text-center xl:text-left",
    heroBodyAlign: "items-start xl:items-end",
  },
  analytical: {
    shellGrid: "grid gap-6 2xl:grid-cols-[1fr_1fr]",
    listRailClass: "2xl:col-span-1",
    contentClass: "2xl:col-span-1",
    detailStackClass: "space-y-6",
    summaryGrid: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4",
    analysisGrid: "grid gap-6 2xl:grid-cols-[1.1fr_0.9fr]",
    chartGrid: "grid gap-6 2xl:grid-cols-[1fr_1fr]",
    heroTitleAlign: "text-left",
    heroBodyAlign: "items-start",
  },
  precision: {
    shellGrid: "grid gap-5 xl:grid-cols-4",
    listRailClass: "xl:col-span-1",
    contentClass: "xl:col-span-3",
    detailStackClass: "space-y-5",
    summaryGrid: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4",
    analysisGrid: "grid gap-5 xl:grid-cols-2",
    chartGrid: "grid gap-5 xl:grid-cols-2",
    heroTitleAlign: "text-left",
    heroBodyAlign: "items-start",
  },
  command: {
    shellGrid: "grid gap-6 2xl:grid-cols-[0.82fr_1.18fr]",
    listRailClass: "2xl:col-span-1",
    contentClass: "2xl:col-span-1",
    detailStackClass: "space-y-6",
    summaryGrid: "grid gap-3 md:grid-cols-2 xl:grid-cols-4",
    analysisGrid: "grid gap-6 2xl:grid-cols-[0.95fr_1.05fr]",
    chartGrid: "grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]",
    heroTitleAlign: "text-center xl:text-left",
    heroBodyAlign: "items-start xl:items-center",
  },
  briefing: {
    shellGrid: "grid gap-6 2xl:grid-cols-[0.95fr_1.05fr]",
    listRailClass: "2xl:col-span-1",
    contentClass: "2xl:col-span-1",
    detailStackClass: "space-y-6",
    summaryGrid: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4",
    analysisGrid: "grid gap-6 2xl:grid-cols-[1fr_0.9fr]",
    chartGrid: "grid gap-6 2xl:grid-cols-[1fr_0.9fr]",
    heroTitleAlign: "text-left",
    heroBodyAlign: "items-start",
  },
};

export function getWorkspacePageLayout(profile: ThemeProfile) {
  return WORKSPACE_LAYOUTS[profile.layout.dashboard];
}

const COMMAND_APP_VARIANT_PAGE_LAYOUT: WorkspacePageLayout = {
  shellGrid: "grid items-start gap-5 xl:grid-cols-[340px_minmax(0,1fr)]",
  listRailClass: "xl:self-start",
  contentClass: "min-w-0",
  detailStackClass: "min-w-0 space-y-5",
  summaryGrid: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4",
  analysisGrid: "grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
  chartGrid: "grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
  heroTitleAlign: "text-left",
  heroBodyAlign: "items-start",
};

export function getWorkspacePageLayoutForVariant(profile: ThemeProfile, appVariant?: AppVariantId) {
  if (appVariant === "command") {
    return COMMAND_APP_VARIANT_PAGE_LAYOUT;
  }

  return getWorkspacePageLayout(profile);
}