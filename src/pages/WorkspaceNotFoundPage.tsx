import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, CheckCircle2 } from "lucide-react";

import heroBg from "@/assets/hero-bg.png";
import { Button } from "@/components/ui/button";
import { useAppVariantSystem } from "@/components/app-shell/AppVariantProvider";
import { ThemeModeToggle, ThemeSelector } from "@/components/theme/ThemeControls";
import { WebsiteFooter } from "@/components/website/WebsiteFooter";
import { WebsiteHeader } from "@/components/website/WebsiteHeader";
import { useWebsiteVariantSystem } from "@/components/website/WebsiteVariantProvider";

import { buildPlatformSiteUrl, formatTenantName } from "@/lib/tenant";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function WorkspaceNotFoundPage({ requestedTenantSlug }: { requestedTenantSlug: string }) {
  const { activeAppVariant } = useAppVariantSystem();
  const { activeWebsiteVariant } = useWebsiteVariantSystem();
  const isNewExperience = activeAppVariant === "command" && activeWebsiteVariant === "editorial";

  const requestedWorkspaceName = useMemo(() => formatTenantName(requestedTenantSlug), [requestedTenantSlug]);
  const requestedWorkspaceHost = useMemo(
    () => (typeof window !== "undefined" ? window.location.host : `${requestedTenantSlug}.localhost`),
    [requestedTenantSlug],
  );
  const platformLoginUrl = useMemo(() => buildPlatformSiteUrl("/login") ?? "/login", []);

  return (
    <>
      {!isNewExperience && <WebsiteHeader />}

      {isNewExperience && (
        <div className="theme-header-surface fixed left-0 right-0 top-0 z-50 border-b border-border/50 backdrop-blur-xl">
          <div className="theme-wide-shell mx-auto flex h-20 items-center justify-between gap-6 px-4 sm:px-6">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/35 bg-primary/10 text-primary shadow-[0_8px_24px_hsl(var(--primary)/0.16)]">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div className="font-semibold uppercase tracking-[0.24em] text-primary">EnergyOS</div>
            </Link>

            <div className="flex items-center gap-2">
              <ThemeSelector compact />
              <ThemeModeToggle compact />
            </div>
          </div>
        </div>
      )}

      <div
        className={[
          "theme-auth-shell relative overflow-hidden pt-24",
          isNewExperience ? "before:absolute before:inset-x-0 before:top-0 before:h-48 before:bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.18),transparent_70%)] before:content-['']" : "",
        ].join(" ")}
      >
        <div className="absolute inset-0">
          <img src={heroBg} alt="Background" className={`h-full w-full object-cover ${isNewExperience ? "opacity-20 saturate-0" : "opacity-35"}`} />
          <div className="theme-auth-overlay absolute inset-0" />
        </div>

        <div className={`museum-grid absolute inset-0 ${isNewExperience ? "opacity-20" : "opacity-30"}`} />

        <div className="theme-wide-shell relative mx-auto grid min-h-[calc(100vh-5rem)] gap-10 px-4 py-8 lg:grid-cols-[1.08fr_0.92fr] lg:px-6 lg:py-10">
          <section
            className={[
              "theme-auth-panel hidden min-h-[680px] flex-col gap-10 border p-8 backdrop-blur-xl lg:flex xl:gap-14",
              isNewExperience ? "rounded-[2.75rem]" : "rounded-[2rem]",
            ].join(" ")}
          >
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
              <div className={["inline-flex items-center gap-3 rounded-full border px-4 py-2 text-primary", isNewExperience ? "border-primary/30 bg-primary/12" : "border-primary/35 bg-primary/10"].join(" ")}>
                <BarChart3 className="h-4 w-4" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em]">Workspace not found</span>
              </div>
              <h1 className="theme-hero-text theme-reading-lg headline-balance mt-10 text-6xl font-semibold leading-[0.95]">
                {requestedWorkspaceName} is not active yet.
              </h1>
              <p className="theme-hero-copy theme-reading-lg mt-6 text-base leading-8">
                No approved organization workspace is connected to {requestedWorkspaceHost}. The workspace URL becomes active only after organization setup and approval on the main platform.
              </p>
            </motion.div>

            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2} className="grid gap-3 md:grid-cols-3">
              {[
                "This hostname is not linked to an approved organization.",
                "Create the organization on the main platform first.",
                "The workspace URL activates automatically after approval.",
              ].map((item) => (
                <div key={item} className="theme-soft-panel rounded-2xl border p-4 text-sm leading-7">
                  <CheckCircle2 className="mb-3 h-4 w-4 text-primary" />
                  {item}
                </div>
              ))}
            </motion.div>
          </section>

          <section className="flex items-center justify-center py-8 lg:py-0">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={0}
              className={[
                "theme-auth-card w-full max-w-xl border p-6 backdrop-blur-xl sm:p-8",
                isNewExperience ? "rounded-[2.35rem]" : "rounded-[2rem]",
              ].join(" ")}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-primary">Workspace not found</div>
              <h2 className="theme-hero-text mt-3 text-4xl font-semibold">This workspace address is not active.</h2>
              <p className="theme-hero-copy mt-3 text-sm leading-7">
                We could not find an approved organization mapped to <span className="theme-hero-text">{requestedWorkspaceHost}</span>.
              </p>
              <div className="theme-soft-panel mt-8 rounded-2xl border px-4 py-4 text-sm leading-7">
                If you are setting up a new organization, start from the main platform. After approval, this workspace link will begin working automatically.
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button type="button" className="h-12 flex-1 text-base" onClick={() => { window.location.href = platformLoginUrl; }}>
                  Go To Platform Login
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" className="h-12 flex-1 text-base" onClick={() => { window.location.href = platformLoginUrl; }}>
                  Create Organization
                </Button>
              </div>
            </motion.div>
          </section>
        </div>
      </div>

      <WebsiteFooter />
    </>
  );
}