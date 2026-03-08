import { createContext, startTransition, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/auth";
import {
  DEFAULT_THEME_PREFERENCE,
  THEME_OPTIONS,
  THEME_STORAGE_KEY,
  ThemeId,
  ThemeMode,
  ThemePreference,
  ThemeProfile,
  getThemeOption,
  isThemePreferenceEqual,
  normalizeThemeId,
  normalizeThemeMode,
  parseStoredThemePreference,
  serializeThemePreference,
} from "@/lib/theme-system";

type ThemeContextValue = ThemePreference & {
  themes: typeof THEME_OPTIONS;
  activeTheme: ThemeProfile;
  setThemeId: (themeId: ThemeId) => void;
  setMode: (mode: ThemeMode) => void;
  applyTheme: (next: Partial<ThemePreference>) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemePreference(preference: ThemePreference) {
  const root = document.documentElement;
  const profile = getThemeOption(preference.themeId);

  root.dataset.theme = preference.themeId;
  root.dataset.mode = preference.mode;
  root.dataset.navStyle = profile.layout.nav;
  root.dataset.themeDensity = profile.layout.density;
  root.dataset.dashboardLayout = profile.layout.dashboard;
  root.dataset.motionPreset = profile.motion.preset;
  root.classList.toggle("dark", preference.mode === "dark");
  root.style.colorScheme = preference.mode;

  root.style.setProperty("--experience-shell-max-width", profile.layout.shellMaxWidth);
  root.style.setProperty("--experience-shell-gap", profile.layout.shellGap);
  root.style.setProperty("--experience-sidebar-width", profile.layout.sidebarWidth);
  root.style.setProperty("--experience-context-rail-width", profile.layout.contextRailWidth);
  root.style.setProperty("--experience-content-padding", profile.layout.contentPadding);
  root.style.setProperty("--experience-panel-radius", profile.layout.panelRadius);
  root.style.setProperty("--experience-card-radius", profile.layout.cardRadius);
  root.style.setProperty("--experience-hero-radius", profile.layout.heroRadius);
  root.style.setProperty("--experience-shell-gap-fluid", `clamp(0.65rem, 0.9vw, ${profile.layout.shellGap})`);
  root.style.setProperty("--experience-shell-padding", `clamp(0.5rem, 1.2vw, ${profile.layout.contentPadding})`);
  root.style.setProperty("--experience-main-padding", `clamp(0.9rem, 1.5vw, calc(${profile.layout.contentPadding} + 0.4rem))`);
  root.style.setProperty("--experience-sidebar-width-fluid", `clamp(15rem, 22vw, ${profile.layout.sidebarWidth})`);
  root.style.setProperty("--experience-panel-radius-fluid", `clamp(1rem, 1.25vw, ${profile.layout.panelRadius})`);
  root.style.setProperty("--experience-card-radius-fluid", `clamp(0.95rem, 1vw, ${profile.layout.cardRadius})`);
  root.style.setProperty("--experience-hero-radius-fluid", `clamp(1.1rem, 1.4vw, ${profile.layout.heroRadius})`);
  root.style.setProperty("--experience-motion-duration", `${profile.motion.durationMs}ms`);
  root.style.setProperty("--experience-motion-stagger", `${profile.motion.staggerMs}ms`);
  root.style.setProperty("--experience-hover-lift", profile.motion.hoverLift);
  root.style.setProperty("--experience-ambient-duration", `${profile.motion.ambientDurationSec}s`);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, setProfileSettings } = useAuth();
  const [preference, setPreference] = useState<ThemePreference>(DEFAULT_THEME_PREFERENCE);
  const [hydrated, setHydrated] = useState(false);
  const preferenceRef = useRef(preference);

  useEffect(() => {
    preferenceRef.current = preference;
  }, [preference]);

  useEffect(() => {
    const stored = parseStoredThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
    setPreference(stored);
    applyThemePreference(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    applyThemePreference(preference);
    localStorage.setItem(THEME_STORAGE_KEY, serializeThemePreference(preference));
  }, [hydrated, preference]);

  useEffect(() => {
    if (!hydrated || !user) {
      return;
    }

    const profilePreference = {
      themeId: normalizeThemeId(profile.color_theme),
      mode: normalizeThemeMode(profile.dark_mode),
    } satisfies ThemePreference;

    setPreference((currentPreference) =>
      isThemePreferenceEqual(profilePreference, currentPreference) ? currentPreference : profilePreference,
    );
  }, [hydrated, profile.color_theme, profile.dark_mode, user]);

  function persistPreference(nextPreference: ThemePreference) {
    if (!user) {
      return;
    }

    void setProfileSettings({
      color_theme: nextPreference.themeId,
      dark_mode: nextPreference.mode === "dark",
    });
  }

  function applyTheme(next: Partial<ThemePreference>) {
    const currentPreference = preferenceRef.current;
    const nextPreference = {
      themeId: normalizeThemeId(next.themeId ?? currentPreference.themeId),
      mode: normalizeThemeMode(next.mode ?? currentPreference.mode),
    } satisfies ThemePreference;

    if (isThemePreferenceEqual(currentPreference, nextPreference)) {
      return;
    }

    startTransition(() => {
      setPreference(nextPreference);
    });

    persistPreference(nextPreference);
  }

  const value = useMemo<ThemeContextValue>(
    () => ({
      ...preference,
      themes: THEME_OPTIONS,
      activeTheme: getThemeOption(preference.themeId),
      setThemeId: (themeId) => applyTheme({ themeId }),
      setMode: (mode) => applyTheme({ mode }),
      applyTheme,
    }),
    [preference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeSystem() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useThemeSystem must be used within ThemeProvider");
  }

  return context;
}
