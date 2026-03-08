import { useState } from "react";
import { ArrowLeft, ArrowRight, BarChart3, CheckCircle2, FileText, Lock, Menu, ShieldCheck, X, Zap } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { ThemeModeToggle, ThemeSelector } from "@/components/theme/ThemeControls";
import { ExperienceVariantToggle } from "@/components/variants/ExperienceVariantToggle";
import { useWebsiteVariantSystem } from "@/components/website/WebsiteVariantProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WebsiteFooter } from "@/components/website/WebsiteFooter";
import { WebsiteHeader } from "@/components/website/WebsiteHeader";

type InfoPageKey = "assurance" | "privacy" | "security" | "compliance";

type InfoSection = {
  title: string;
  body: string;
  bullets: string[];
};

type InfoPageContent = {
  kicker: string;
  title: string;
  description: string;
  badge: string;
  icon: typeof ShieldCheck;
  highlights: string[];
  sections: InfoSection[];
};

const PAGE_CONTENT: Record<InfoPageKey, InfoPageContent> = {
  assurance: {
    kicker: "Assurance",
    title: "Operational assurance for enterprise climate programs.",
    description:
      "EnergyOS combines governed data intake, workflow controls, and review checkpoints so sustainability reporting stays defensible as teams scale.",
    badge: "Governed delivery",
    icon: ShieldCheck,
    highlights: [
      "Quarterly data certification workflows",
      "Role-based approvals across portfolio submissions",
      "Documented review trails for executive sign-off",
    ],
    sections: [
      {
        title: "Control framework",
        body:
          "Every reporting cycle can be structured with named reviewers, approval thresholds, and submission deadlines to reduce manual reconciliation.",
        bullets: [
          "Site-level submissions can be locked after review.",
          "Approvers receive clear pending-action queues.",
          "Version history keeps changes attributable.",
        ],
      },
      {
        title: "Evidence readiness",
        body:
          "Program teams can align source documents, assumptions, and commentary to the same reporting objects used for dashboards and strategy planning.",
        bullets: [
          "Context notes travel with the reported data.",
          "Review teams can inspect exceptions quickly.",
          "Decision logs are retained for audit support.",
        ],
      },
      {
        title: "Executive confidence",
        body:
          "Leadership sees one consistent story across emissions, energy, MACC, and strategy modules without losing traceability back to the underlying records.",
        bullets: [
          "Portfolio rollups stay connected to site detail.",
          "Approval status is visible before publication.",
          "Shared definitions reduce interpretation drift.",
        ],
      },
    ],
  },
  privacy: {
    kicker: "Privacy",
    title: "Clear privacy practices for operational climate data.",
    description:
      "EnergyOS is designed to minimize unnecessary personal data, separate tenant information boundaries, and keep access to user identity data restricted to authorized roles.",
    badge: "Data stewardship",
    icon: Lock,
    highlights: [
      "Tenant-aware data separation",
      "Least-privilege access to identity records",
      "Defined retention expectations for workspace activity",
    ],
    sections: [
      {
        title: "Data collection",
        body:
          "The platform focuses on operational, emissions, and governance data. User profile information is limited to what is needed for authentication, permissions, and support workflows.",
        bullets: [
          "Account data is scoped to authentication and access control.",
          "Operational metrics remain tied to tenant context.",
          "Administrative activity can be reviewed when needed.",
        ],
      },
      {
        title: "Use of information",
        body:
          "Collected data supports emissions analysis, strategy planning, permission enforcement, and customer support for the subscribed workspace.",
        bullets: [
          "No public exposure of tenant data by default.",
          "Access follows assigned roles and module permissions.",
          "Configuration changes remain attributable to users.",
        ],
      },
      {
        title: "Retention and review",
        body:
          "Workspace owners and administrators can review key operational records and coordinate retention policies that align with their internal governance needs.",
        bullets: [
          "Historical records support trend analysis.",
          "Tenant administrators retain oversight of workspace operations.",
          "Support reviews can be limited to authorized cases.",
        ],
      },
    ],
  },
  security: {
    kicker: "Security",
    title: "Security controls aligned to enterprise operations.",
    description:
      "EnergyOS protects workspace access with role-aware authorization, authenticated user sessions, and administration patterns built for multi-tenant control.",
    badge: "Defense in depth",
    icon: ShieldCheck,
    highlights: [
      "Authenticated sessions for protected routes",
      "Role and module permission enforcement",
      "Administrative separation for tenant operations",
    ],
    sections: [
      {
        title: "Access control",
        body:
          "Protected routes require authenticated users, while tenant and admin operations can be constrained by explicit permission checks across modules.",
        bullets: [
          "Authentication gates platform entry points.",
          "Module permissions narrow who can change data.",
          "Administrative actions can be scoped by role.",
        ],
      },
      {
        title: "Tenant isolation",
        body:
          "The platform architecture is structured so organizations operate within their own workspace boundaries while maintaining central governance where required.",
        bullets: [
          "Tenant context informs access decisions.",
          "Administrative workflows can respect organization boundaries.",
          "Shared services can still preserve workspace separation.",
        ],
      },
      {
        title: "Operational monitoring",
        body:
          "Security-relevant actions such as administrative changes and approval flows can be reviewed to support governance, troubleshooting, and internal oversight.",
        bullets: [
          "Key changes remain attributable.",
          "Audit-oriented records support review workflows.",
          "Platform governance stays connected to user actions.",
        ],
      },
    ],
  },
  compliance: {
    kicker: "Compliance",
    title: "Compliance support for reporting and governance teams.",
    description:
      "EnergyOS helps teams align operational evidence, reporting workflows, and access controls so regulatory and internal compliance efforts are easier to manage.",
    badge: "Reporting discipline",
    icon: FileText,
    highlights: [
      "Structured review steps before publication",
      "Consistent records across climate program modules",
      "Support for policy-driven governance practices",
    ],
    sections: [
      {
        title: "Reporting workflows",
        body:
          "Teams can move from raw operational inputs to reviewed dashboards and strategy outputs through one governed workspace instead of scattered spreadsheets.",
        bullets: [
          "Shared definitions improve reporting consistency.",
          "Approvals can be matched to internal policy steps.",
          "Reviewers see the same metrics used in planning.",
        ],
      },
      {
        title: "Documentation posture",
        body:
          "Explanatory notes, source context, and workflow records help compliance teams understand how key numbers were produced and approved.",
        bullets: [
          "Context can sit alongside reported outcomes.",
          "Changes remain visible through review cycles.",
          "Supporting narratives reduce handoff friction.",
        ],
      },
      {
        title: "Program alignment",
        body:
          "Because energy, emissions, MACC, and strategy data live in one platform, compliance work can stay aligned with the same operating model the business uses every day.",
        bullets: [
          "One platform reduces fragmented evidence chains.",
          "Cross-functional teams work from shared records.",
          "Governance stays connected to execution.",
        ],
      },
    ],
  },
};

const PATH_TO_KEY: Record<string, InfoPageKey> = {
  "/assurance": "assurance",
  "/privacy": "privacy",
  "/security": "security",
  "/compliance": "compliance",
};

function EditorialInfoHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-12">
      <Link to="/" className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_12px_36px_hsl(var(--primary)/0.24)]">
          <Zap className="h-5 w-5" />
        </div>
        <div className="text-sm font-semibold uppercase tracking-[0.24em] text-foreground">EnergyOS</div>
      </Link>

      <nav className="hidden items-center gap-8 md:flex">
        <Link to="/" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Home</Link>
        <Link to="/assurance" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Assurance</Link>
      </nav>

      <div className="hidden items-center gap-3 md:flex">
        <ThemeSelector compact />
        <ThemeModeToggle compact />
        <Button variant="ghost" size="sm" asChild>
          <Link to="/login">Sign In</Link>
        </Button>
        <Button size="sm" className="rounded-full px-5" asChild>
          <Link to="/login">
            Enter Platform
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <button type="button" className="rounded-xl border border-border/60 bg-card/70 p-2 md:hidden" onClick={() => setOpen((value) => !value)}>
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open ? (
        <div className="absolute left-6 right-6 top-full mt-3 rounded-2xl border border-border/60 bg-card/95 p-4 shadow-[0_24px_80px_hsl(var(--shadow-color)/0.18)] backdrop-blur-xl md:hidden">
          <div className="space-y-2">
            <Link to="/" className="block rounded-xl px-3 py-2 text-sm text-muted-foreground" onClick={() => setOpen(false)}>Home</Link>
            <Link to="/assurance" className="block rounded-xl px-3 py-2 text-sm text-muted-foreground" onClick={() => setOpen(false)}>Assurance</Link>
          </div>
          <div className="mt-3 grid gap-2">
            <div className="flex items-center justify-center gap-2 pb-1">
              <ThemeSelector compact />
              <ThemeModeToggle compact />
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/login">Get Started</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function EditorialInfoFooter() {
  return (
    <footer className="relative z-10 border-t border-border/50 py-10 text-sm text-muted-foreground">
      <div className="mx-auto grid max-w-5xl gap-8 px-6 lg:grid-cols-[1.4fr_0.8fr_1fr] lg:px-12">
        <div className="space-y-4 text-center lg:text-left">
          <div className="flex items-center justify-center gap-3 lg:justify-start">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BarChart3 className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground">EnergyOS</span>
          </div>
          <p className="max-w-2xl leading-7">A classic canvas-style public layer for assurance, privacy, security, and compliance pages.</p>
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Experience version</div>
            <ExperienceVariantToggle size="sm" />
          </div>
        </div>

        <div className="text-center lg:text-left">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Platform</h4>
          <ul className="space-y-2 text-xs">
            <li><Link to="/" className="transition-colors hover:text-foreground">Home</Link></li>
            <li><Link to="/login" className="transition-colors hover:text-foreground">Access Portal</Link></li>
          </ul>
        </div>

        <div className="text-center lg:text-left">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Assurance</h4>
          <ul className="space-y-2 text-xs">
            <li><Link to="/assurance" className="transition-colors hover:text-foreground">Assurance Overview</Link></li>
            <li><Link to="/privacy" className="transition-colors hover:text-foreground">Privacy</Link></li>
            <li><Link to="/security" className="transition-colors hover:text-foreground">Security</Link></li>
            <li><Link to="/compliance" className="transition-colors hover:text-foreground">Compliance</Link></li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-5xl border-t border-border/50 px-6 pt-6 text-center lg:px-12 lg:text-left">
        <p>© 2026 EnergyOS. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default function InfoPage() {
  const location = useLocation();
  const { activeWebsiteVariant } = useWebsiteVariantSystem();
  const pageKey = PATH_TO_KEY[location.pathname] ?? "assurance";
  const page = PAGE_CONTENT[pageKey];
  const Icon = page.icon;

  if (activeWebsiteVariant === "editorial") {
    return (
      <div data-website-variant-view="editorial" className="relative min-h-screen overflow-hidden bg-background text-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.08),transparent_50%)]" />

        <EditorialInfoHeader />

        <main className="relative z-10 mx-auto max-w-7xl px-6 pb-20 pt-10 lg:px-12 lg:pt-16">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <section className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                <Icon className="h-4 w-4" />
                {page.kicker}
              </div>
              <div>
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl md:leading-[1.02]">{page.title}</h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">{page.description}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" className="rounded-full" asChild>
                  <Link to="/">
                    <ArrowLeft className="h-4 w-4" />
                    Back to home
                  </Link>
                </Button>
                <Button className="rounded-full" asChild>
                  <Link to="/login">Access platform</Link>
                </Button>
              </div>
            </section>

            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">{page.badge}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {page.highlights.map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm leading-7 text-muted-foreground">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <section className="mt-14 grid gap-6 lg:grid-cols-3">
            {page.sections.map((section) => (
              <Card key={section.title} className="glass-card h-full border-border/50">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-7 text-muted-foreground">{section.body}</p>
                  <ul className="mt-5 space-y-3 text-sm leading-7 text-muted-foreground">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-3">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </section>
        </main>

        <EditorialInfoFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <WebsiteHeader />

      <main className="theme-wide-shell mx-auto px-4 pb-24 pt-32 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <section className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              <Icon className="h-4 w-4" />
              {page.kicker}
            </div>
            <div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl md:leading-[1.02]">{page.title}</h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">{page.description}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" asChild>
                <Link to="/">
                  <ArrowLeft className="h-4 w-4" />
                  Back to home
                </Link>
              </Button>
              <Button asChild>
                <Link to="/login">Access platform</Link>
              </Button>
            </div>
          </section>

          <Card className="theme-widget-card border-primary/15">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">{page.badge}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {page.highlights.map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm leading-7 text-muted-foreground">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <section className="mt-14 grid gap-6 lg:grid-cols-3">
          {page.sections.map((section) => (
            <Card key={section.title} className="theme-widget-card h-full border-border/70">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-muted-foreground">{section.body}</p>
                <ul className="mt-5 space-y-3 text-sm leading-7 text-muted-foreground">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>

      <WebsiteFooter />
    </div>
  );
}