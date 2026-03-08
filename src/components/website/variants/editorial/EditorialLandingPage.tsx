import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Globe,
  Menu,
  Shield,
  TrendingDown,
  X,
  Zap,
} from "lucide-react";

import { ExperienceVariantToggle } from "@/components/variants/ExperienceVariantToggle";
import { ThemeModeToggle, ThemeSelector } from "@/components/theme/ThemeControls";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const features = [
  { icon: BarChart3, title: "Emissions Analytics", description: "Track CO2 across scopes with crisp executive and operator views." },
  { icon: TrendingDown, title: "MACC Analysis", description: "Compare abatement options by cost, impact, and delivery readiness." },
  { icon: Zap, title: "Energy Monitoring", description: "Monitor fuel consumption, site efficiency, and energy mix in one workspace." },
  { icon: Globe, title: "Strategy Planning", description: "Build roadmaps, coordinate initiatives, and track target progress." },
  { icon: Shield, title: "Admin Governance", description: "Handle approvals, invitations, access control, and audit workflows." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.08, duration: 0.72, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

function FloatingShape({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -30, 0], scale: [1, 1.08, 1] }}
      transition={{ duration: 6, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

function CanvasHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-12">
      <Link to="/" className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_12px_36px_hsl(var(--primary)/0.24)]">
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-foreground">EnergyOS</div>
        </div>
      </Link>

      <nav className="hidden items-center gap-8 md:flex">
        <a href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Features</a>
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
            <a href="#features" className="block rounded-xl px-3 py-2 text-sm text-muted-foreground" onClick={() => setOpen(false)}>Features</a>
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

function DashboardPreview() {
  const bars = [35, 55, 45, 70, 60, 80, 50, 65, 75, 55, 40, 70];

  return (
    <div className="space-y-4 p-6 md:p-8">
      <div className="flex items-center">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-destructive" />
          <div className="h-3 w-3 rounded-full bg-chart-4" />
          <div className="h-3 w-3 rounded-full bg-chart-2" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Emissions", value: "12,450 tCO2", tone: "text-chart-2" },
          { label: "Energy Saved", value: "2.4 GWh", tone: "text-chart-3" },
          { label: "Cost Avoided", value: "$1.2M", tone: "text-chart-4" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg bg-sidebar-accent/50 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/70">{item.label}</div>
            <div className={cn("mt-1 text-lg font-semibold", item.tone)}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-sidebar-accent/30 p-4">
        <div className="mb-3 text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/70">Monthly Emissions Trend</div>
        <div className="flex h-24 items-end gap-1.5">
          {bars.map((height, index) => (
            <motion.div
              key={index}
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ delay: 0.8 + index * 0.06, duration: 0.45 }}
              className="flex-1 rounded-t-sm bg-primary/80"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function EditorialLandingPage() {
  const navigate = useNavigate();

  return (
    <div data-website-variant-view="editorial" className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <FloatingShape className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-primary/18 blur-3xl" delay={0} />
      <FloatingShape className="absolute -left-20 top-1/3 h-72 w-72 rounded-full bg-chart-3/20 blur-3xl" delay={2} />
      <FloatingShape className="absolute bottom-20 right-1/4 h-80 w-80 rounded-full bg-chart-2/16 blur-3xl" delay={4} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.08),transparent_50%)]" />

      <CanvasHeader />

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-32 pt-14 lg:px-12 lg:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <span className="mb-6 inline-flex rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-foreground">
              Enterprise Carbon Intelligence
            </span>
          </motion.div>

          <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1} className="text-5xl font-semibold tracking-tight md:text-7xl lg:text-8xl lg:leading-[0.95]">
            Your energy
            <br />
            data, <span className="text-primary">clearly framed.</span>
          </motion.h1>

          <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2} className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            Track emissions, optimize energy, model abatement cost, and execute sustainability strategy from one enterprise platform with a cleaner public front door.
          </motion.p>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Button size="lg" className="rounded-full px-8 py-6 text-base" onClick={() => navigate("/login")}>
              Get Started
              <ArrowRight className="h-5 w-5" />
            </Button>
          </motion.div>
        </div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4} className="mx-auto mt-20 max-w-5xl">
          <div className="rounded-2xl border border-border/50 bg-card/70 p-2 shadow-[0_32px_100px_hsl(var(--shadow-color)/0.18)] backdrop-blur-xl">
            <div className="overflow-hidden rounded-xl bg-sidebar">
              <DashboardPreview />
            </div>
          </div>
        </motion.div>
      </section>

      <section id="features" className="relative z-10 mx-auto max-w-7xl px-6 py-24 lg:px-12">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-16 text-center">
          <h2 className="text-4xl font-semibold md:text-5xl">
            Built for <span className="text-primary">energy leaders</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">The same core platform capabilities, presented with the sharper canvas-inspired public layout.</p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.45 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="glass-card cursor-pointer rounded-2xl p-8"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <feature.icon className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-4xl px-6 py-24 text-center lg:px-12">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass-card relative overflow-hidden rounded-[2rem] p-12 md:p-16">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/6 to-transparent" />
          <div className="relative">
            <h2 className="mb-4 text-3xl font-semibold md:text-4xl">Ready to transform your energy strategy?</h2>
            <p className="mx-auto mb-8 max-w-lg text-muted-foreground">
              Join enterprise teams using EnergyOS to drive measurable decarbonization outcomes with the same backend workflows and a cleaner new presentation layer.
            </p>
            <Button size="lg" className="rounded-full px-10 py-6 text-base" onClick={() => navigate("/login")}>
              Start Now
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </motion.div>
      </section>

      <footer className="relative z-10 border-t border-border/50 py-10 text-sm text-muted-foreground">
        <div className="mx-auto grid max-w-5xl gap-8 px-6 lg:grid-cols-[1.4fr_0.8fr_1fr] lg:px-12">
          <div className="space-y-4 text-center lg:text-left">
            <div className="flex items-center justify-center gap-3 lg:justify-start">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <BarChart3 className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground">EnergyOS</span>
            </div>
            <p className="max-w-2xl leading-7">A cleaner public entry point for the same planning, analytics, and governance platform.</p>
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Experience version</div>
              <ExperienceVariantToggle size="sm" />
            </div>
          </div>

          <div className="text-center lg:text-left">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Platform</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#features" className="transition-colors hover:text-foreground">Features</a></li>
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
    </div>
  );
}
