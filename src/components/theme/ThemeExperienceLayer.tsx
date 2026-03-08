import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

import { useThemeSystem } from "./ThemeProvider";

export function ThemeExperienceBackdrop() {
  const { activeTheme } = useThemeSystem();
  const shouldReduceMotion = useReducedMotion();
  const ambientTransition = shouldReduceMotion
    ? undefined
    : {
        duration: activeTheme.motion.ambientDurationSec,
        repeat: Infinity,
        repeatType: "mirror" as const,
        ease: "easeInOut" as const,
      };

  return (
    <div aria-hidden="true" className="theme-environment pointer-events-none absolute inset-0 overflow-hidden">
      <div className="theme-environment-base absolute inset-0" />
      <div className="theme-environment-texture absolute inset-0" />
      <div className="theme-environment-grid absolute inset-0" />

      <motion.div
        className={cn("theme-environment-orb theme-environment-orb-a", `theme-environment-${activeTheme.id}`)}
        animate={shouldReduceMotion ? undefined : { x: [0, 18, -12, 0], y: [0, -22, 10, 0], scale: [1, 1.05, 0.98, 1] }}
        transition={ambientTransition}
      />
      <motion.div
        className={cn("theme-environment-orb theme-environment-orb-b", `theme-environment-${activeTheme.id}`)}
        animate={shouldReduceMotion ? undefined : { x: [0, -20, 8, 0], y: [0, 14, -16, 0], scale: [1, 0.96, 1.04, 1] }}
        transition={ambientTransition}
      />
      <motion.div
        className={cn("theme-environment-ribbon absolute inset-x-[8%] top-[12%] h-64", `theme-environment-ribbon-${activeTheme.id}`)}
        animate={shouldReduceMotion ? undefined : { opacity: [0.32, 0.54, 0.36], y: [0, 12, -8] }}
        transition={ambientTransition}
      />
      <div className="theme-environment-vignette absolute inset-0" />
    </div>
  );
}