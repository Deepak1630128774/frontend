import { useEffect, useRef, useState } from "react";

import { motion } from "framer-motion";
import { Check, MonitorCog, Moon, Palette, SunMedium } from "lucide-react";

import { ExperienceVariantToggle } from "@/components/variants/ExperienceVariantToggle";
import { VariantTogglePill } from "@/components/variants/VariantTogglePill";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

import { ThemeId, type ThemeOption } from "@/lib/theme-system";
import { useThemeSystem } from "./ThemeProvider";

export function ThemeModeToggle({ compact = false }: { compact?: boolean }) {
  const { mode, setMode } = useThemeSystem();

  return (
    <div
      className={cn(
        "theme-toggle relative inline-flex items-center rounded-full border border-border/70 bg-card/70 p-1 shadow-[0_18px_44px_hsl(var(--shadow-color)/0.15)] backdrop-blur-xl",
        compact ? "h-10 w-[88px]" : "h-11 w-[96px]",
      )}
      aria-label="Theme mode toggle"
      role="group"
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className={cn(
          "absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-full bg-primary/16 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.28),0_10px_24px_hsl(var(--shadow-color)/0.16)]",
          mode === "light" ? "left-1" : "left-[calc(50%+0.125rem)]",
        )}
      />
      <button
        type="button"
        className="relative z-10 flex flex-1 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => setMode("light")}
        aria-pressed={mode === "light"}
        title="Switch to light mode"
      >
        <SunMedium className={cn("h-4 w-4 transition-transform duration-300", mode === "light" && "text-primary rotate-12")} />
      </button>
      <button
        type="button"
        className="relative z-10 flex flex-1 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => setMode("dark")}
        aria-pressed={mode === "dark"}
        title="Switch to dark mode"
      >
        <Moon className={cn("h-4 w-4 transition-transform duration-300", mode === "dark" && "text-primary -rotate-12")} />
      </button>
    </div>
  );
}

export function ThemeSelector({ align = "end", compact = false }: { align?: "start" | "center" | "end"; compact?: boolean }) {
  const { activeTheme, themeId, themes, setThemeId } = useThemeSystem();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={compact ? "icon" : "sm"}
          className={cn(
            "theme-control-button rounded-full border-border/70 bg-card/55 text-foreground hover:bg-card/78 hover:text-foreground",
            !compact && "gap-2 px-4",
          )}
        >
          <Palette className="h-4 w-4" />
          {!compact && (
            <>
              <span>{activeTheme.label}</span>
              <span className="text-[10px] tracking-[0.18em] text-muted-foreground">Theme</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="theme-selector-panel w-[min(94vw,27rem)] rounded-[1.5rem] border-border/70 bg-popover/95 p-4 shadow-[0_28px_90px_hsl(var(--shadow-color)/0.26)] backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Theme studio</div>
            <h3 className="mt-2 text-2xl font-semibold text-foreground">Personalize the atmosphere</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Modules, data, and copy stay fixed. Layout, environment, and motion shift instantly by profile.</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
            <MonitorCog className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-4">
          <ThemeOptionCollection themes={themes} themeId={themeId} onSelect={setThemeId} />
        </div>
      </PopoverContent>
    </Popover>
  );
}

type ThemeOptionCollectionProps = {
  themes: ThemeOption[];
  themeId: ThemeId;
  onSelect: (themeId: ThemeId) => void;
};

function ThemeOptionCollection({ themes, themeId, onSelect }: ThemeOptionCollectionProps) {
  const mobileScrollerRef = useRef<HTMLDivElement | null>(null);
  const [mobileIndex, setMobileIndex] = useState(() => Math.max(0, themes.findIndex((theme) => theme.id === themeId)));

  useEffect(() => {
    const nextIndex = themes.findIndex((theme) => theme.id === themeId);
    setMobileIndex(nextIndex >= 0 ? nextIndex : 0);
  }, [themeId, themes]);

  function getScrollStep() {
    const scroller = mobileScrollerRef.current;
    const firstCard = scroller?.firstElementChild as HTMLElement | null;

    if (!scroller || !firstCard) {
      return 0;
    }

    const cardWidth = firstCard.getBoundingClientRect().width;
    return cardWidth + 12;
  }

  function scrollToIndex(nextIndex: number) {
    const scroller = mobileScrollerRef.current;
    const step = getScrollStep();

    if (!scroller || !step) {
      return;
    }

    scroller.scrollTo({
      left: nextIndex * step,
      behavior: "smooth",
    });
  }

  function handleSliderChange(values: number[]) {
    const nextIndex = values[0] ?? 0;
    setMobileIndex(nextIndex);
    scrollToIndex(nextIndex);
  }

  function handleScrollerScroll() {
    const scroller = mobileScrollerRef.current;
    const step = getScrollStep();

    if (!scroller || !step) {
      return;
    }

    const nextIndex = Math.round(scroller.scrollLeft / step);
    if (nextIndex !== mobileIndex) {
      setMobileIndex(nextIndex);
    }
  }

  return (
    <div className="space-y-4">
      <div
        ref={mobileScrollerRef}
        className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 sm:hidden"
        onScroll={handleScrollerScroll}
      >
        {themes.map((theme) => (
          <ThemeOptionCard
            key={theme.id}
            id={theme.id}
            label={theme.label}
            season={theme.season}
            description={theme.description}
              layoutLabel={`${theme.layout.nav} nav`}
              motionLabel={theme.motion.preset}
            previewClassName={theme.previewClassName}
            selected={themeId === theme.id}
            onSelect={onSelect}
            className="w-[min(82vw,18rem)] shrink-0 snap-center"
          />
        ))}
      </div>

      {themes.length > 1 ? (
        <div className="sm:hidden">
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span>Scroll themes</span>
            <span>{mobileIndex + 1} / {themes.length}</span>
          </div>
          <Slider
            min={0}
            max={themes.length - 1}
            step={1}
            value={[mobileIndex]}
            onValueChange={handleSliderChange}
            aria-label="Theme slider"
          />
        </div>
      ) : null}

      <div className="hidden gap-3 sm:grid sm:grid-cols-2">
        {themes.map((theme) => (
          <ThemeOptionCard
            key={theme.id}
            id={theme.id}
            label={theme.label}
            season={theme.season}
            description={theme.description}
              layoutLabel={`${theme.layout.nav} nav`}
              motionLabel={theme.motion.preset}
            previewClassName={theme.previewClassName}
            selected={themeId === theme.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

type ThemeOptionCardProps = {
  id: ThemeId;
  label: string;
  season: string;
  description: string;
  layoutLabel: string;
  motionLabel: string;
  previewClassName: string;
  selected: boolean;
  onSelect: (themeId: ThemeId) => void;
  className?: string;
};

function ThemeOptionCard({ id, label, season, description, layoutLabel, motionLabel, previewClassName, selected, onSelect, className }: ThemeOptionCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={cn(
        "group rounded-[1.3rem] border border-border/70 bg-card/65 p-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/28 hover:bg-card/82 hover:shadow-[0_22px_50px_hsl(var(--shadow-color)/0.14)]",
        selected && "border-primary/45 bg-primary/8 shadow-[0_20px_40px_hsl(var(--primary)/0.14)]",
        className,
      )}
    >
      <div className={cn("theme-preview-swatch relative h-20 overflow-hidden rounded-[1rem] bg-gradient-to-br", previewClassName)}>
        <div className="theme-preview-shine absolute inset-0" />
        <div className="theme-preview-badge absolute bottom-3 left-3 flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] backdrop-blur-sm">
          <span>{season}</span>
        </div>
        {selected && (
          <div className="theme-preview-check absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-sm">
            <Check className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">{label}</div>
          <div className="mt-1 text-xs leading-5 text-muted-foreground">{description}</div>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="rounded-full border border-border/70 px-2 py-1">{layoutLabel}</span>
            <span className="rounded-full border border-border/70 px-2 py-1">{motionLabel}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

export function ThemePreferenceGrid() {
  const { mode, activeTheme, themes, themeId, setMode, setThemeId } = useThemeSystem();

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-[1.5rem] border border-border/70 bg-secondary/25 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Viewing mode</div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Use the always-visible sun and moon control for instant light and dark switching.</p>
        </div>
        <ThemeModeToggle />
      </div>

      <ThemeOptionCollection themes={themes} themeId={themeId} onSelect={setThemeId} />

      <div className="rounded-[1.5rem] border border-border/70 bg-secondary/25 p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Experience version</div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Use one combined switch to move the product between the old experience and the new experience.</p>
        <div className="mt-4">
          <ExperienceVariantToggle />
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-border/70 bg-secondary/25 p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Current selection</div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{activeTheme.label}</span>
          <span className="rounded-full border border-border/70 bg-background/55 px-3 py-1 capitalize">{mode} mode</span>
          <button type="button" className="font-medium text-primary transition-colors hover:text-foreground" onClick={() => setMode(mode === "dark" ? "light" : "dark")}>
            Toggle mode instantly
          </button>
        </div>
      </div>
    </div>
  );
}