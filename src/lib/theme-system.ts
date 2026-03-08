export type ThemeId = "default" | "autumn";
export type ThemeMode = "light" | "dark";
export type ThemeNavStyle = "sidebar" | "hybrid" | "topbar";
export type ThemeDensity = "airy" | "balanced" | "structured" | "compact";
export type ThemeDashboardLayout = "balanced" | "open" | "spotlight" | "analytical";
export type ThemeMotionPreset = "cinematic" | "organic" | "energetic" | "calm";

export type ThemePreference = {
  themeId: ThemeId;
  mode: ThemeMode;
};

export type ThemeOption = {
  id: ThemeId;
  label: string;
  season: string;
  description: string;
  previewClassName: string;
};

export type ThemeProfile = ThemeOption & {
  layout: {
    nav: ThemeNavStyle;
    density: ThemeDensity;
    dashboard: ThemeDashboardLayout;
    heroAlign: "left" | "center";
    shellMaxWidth: string;
    shellGap: string;
    sidebarWidth: string;
    contextRailWidth: string;
    contentPadding: string;
    panelRadius: string;
    cardRadius: string;
    heroRadius: string;
  };
  motion: {
    preset: ThemeMotionPreset;
    durationMs: number;
    staggerMs: number;
    hoverLift: string;
    ambientDurationSec: number;
  };
  environment: {
    mood: string;
    backgroundLabel: string;
    imageryStyle: string;
    overlayStyle: string;
  };
  copy: {
    tagline: string;
    sidebarLabel: string;
    pulseLabel: string;
    pulseNote: string;
    selectorNote: string;
  };
};

export const THEME_STORAGE_KEY = "energyos-theme-preference";

export const DEFAULT_THEME_PREFERENCE: ThemePreference = {
  themeId: "default",
  mode: "dark",
};

const LEGACY_THEME_MAP: Record<string, ThemeId> = {
  emerald: "default",
  blue: "default",
  purple: "default",
  rose: "autumn",
  spring: "autumn",
  summer: "default",
};

export const THEME_OPTIONS: ThemeProfile[] = [
  {
    id: "default",
    label: "Default",
    season: "Signature",
    description: "The current cinematic EnergyOS atmosphere preserved exactly as the baseline experience.",
    previewClassName: "from-[#0d3946] via-[#145362] to-[#1f7c69]",
    layout: {
      nav: "sidebar",
      density: "balanced",
      dashboard: "balanced",
      heroAlign: "left",
      shellMaxWidth: "1760px",
      shellGap: "1rem",
      sidebarWidth: "320px",
      contextRailWidth: "310px",
      contentPadding: "1.5rem",
      panelRadius: "1.8rem",
      cardRadius: "1.45rem",
      heroRadius: "1.95rem",
    },
    motion: {
      preset: "cinematic",
      durationMs: 540,
      staggerMs: 70,
      hoverLift: "8px",
      ambientDurationSec: 18,
    },
    environment: {
      mood: "Cinematic SaaS gallery",
      backgroundLabel: "",
      imageryStyle: "",
      overlayStyle: "Soft spotlight overlays with restrained shimmer",
    },
    copy: {
      tagline: "A cinematic interface for live climate operations.",
      sidebarLabel: "Museum-grade interface",
      pulseLabel: "System pulse",
      pulseNote: "Live operations view with integrated climate metrics.",
      selectorNote: "Balanced SaaS dashboard layout with exhibition-style hierarchy.",
    },
  },
  {
    id: "autumn",
    label: "Black & White",
    season: "Classic",
    description: "Simple old-school monochrome design with hard contrast, flat panels, and no decorative color.",
    previewClassName: "from-[#050505] via-[#5e5e5e] to-[#f5f5f5]",
    layout: {
      nav: "sidebar",
      density: "structured",
      dashboard: "analytical",
      heroAlign: "left",
      shellMaxWidth: "1720px",
      shellGap: "0.9rem",
      sidebarWidth: "296px",
      contextRailWidth: "300px",
      contentPadding: "1.35rem",
      panelRadius: "0.5rem",
      cardRadius: "0.35rem",
      heroRadius: "0.5rem",
    },
    motion: {
      preset: "calm",
      durationMs: 260,
      staggerMs: 30,
      hoverLift: "2px",
      ambientDurationSec: 0,
    },
    environment: {
      mood: "Old-school monochrome workspace",
      backgroundLabel: "",
      imageryStyle: "",
      overlayStyle: "No ambient overlays or decorative glow",
    },
    copy: {
      tagline: "A simple black-and-white workspace with old-school contrast and stripped-back presentation.",
      sidebarLabel: "Black and white",
      pulseLabel: "System status",
      pulseNote: "No gradients, no color accents, and no ambient effects distracting from the data.",
      selectorNote: "Classic monochrome layout with square edges, quiet motion, and flat surfaces.",
    },
  },
];

export function normalizeThemeId(value?: string | null): ThemeId {
  if (!value) {
    return DEFAULT_THEME_PREFERENCE.themeId;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized in LEGACY_THEME_MAP) {
    return LEGACY_THEME_MAP[normalized];
  }

  const match = THEME_OPTIONS.find((theme) => theme.id === normalized);
  return match?.id ?? DEFAULT_THEME_PREFERENCE.themeId;
}

export function normalizeThemeMode(value?: boolean | string | number | null): ThemeMode {
  if (value === true || value === 1 || value === "1") {
    return "dark";
  }

  if (value === false || value === 0 || value === "0") {
    return "light";
  }

  if (typeof value === "string") {
    return value.trim().toLowerCase() === "light" ? "light" : "dark";
  }

  return DEFAULT_THEME_PREFERENCE.mode;
}

export function serializeThemePreference(preference: ThemePreference) {
  return JSON.stringify(preference);
}

export function parseStoredThemePreference(value?: string | null): ThemePreference {
  if (!value) {
    return DEFAULT_THEME_PREFERENCE;
  }

  try {
    const parsed = JSON.parse(value) as Partial<ThemePreference>;
    return {
      themeId: normalizeThemeId(parsed.themeId),
      mode: normalizeThemeMode(parsed.mode),
    };
  } catch {
    return DEFAULT_THEME_PREFERENCE;
  }
}

export function isThemePreferenceEqual(left: ThemePreference, right: ThemePreference) {
  return left.themeId === right.themeId && left.mode === right.mode;
}

export function getThemeOption(themeId: ThemeId) {
  return THEME_OPTIONS.find((theme) => theme.id === themeId) ?? THEME_OPTIONS[0];
}

export function getThemeProfile(themeId: ThemeId) {
  return getThemeOption(themeId);
}
