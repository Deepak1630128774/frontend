import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, CheckCircle2, Compass, Flame, Lightbulb, Shield, Waves } from "lucide-react";

import heroBg from "@/assets/hero-bg.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WebsiteFooter } from "@/components/website/WebsiteFooter";
import { WebsiteHeader } from "@/components/website/WebsiteHeader";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const capabilities = [
  {
    icon: BarChart3,
    title: "Emissions Analytics",
    description: "Track CO2 across scopes with crisp executive and operator views.",
  },
  {
    icon: Flame,
    title: "MACC Analysis",
    description: "Compare abatement options by cost, impact, and delivery readiness.",
  },
  {
    icon: Lightbulb,
    title: "Energy Monitoring",
    description: "Monitor fuel consumption, site efficiency, and energy mix in one workspace.",
  },
  {
    icon: Compass,
    title: "Strategy Planning",
    description: "Build roadmaps, coordinate initiatives, and track target progress.",
  },
  {
    icon: Shield,
    title: "Admin Governance",
    description: "Handle approvals, invitations, access control, and audit workflows.",
  },
];

const milestones = [
  {
    title: "Sense the whole system",
    body: "EnergyOS connects emissions, fuel mix, costs, and strategy so leaders stop reading isolated reports.",
  },
  {
    title: "Decide with clarity",
    body: "Every section is framed for signal over noise, with rhythm, hierarchy, and slower premium motion.",
  },
  {
    title: "Act with confidence",
    body: "Save, compare, assign, and approve in the same product language used across every module.",
  },
];

const testimonials = [
  {
    quote: "The interface finally matches the seriousness of the work. Teams move faster because the product feels composed instead of crowded.",
    author: "Riya Sharma",
    role: "",
  },
  {
    quote: "The transition from landing page to dashboards feels like one designed environment now, not stitched-together tools.",
    author: "Arjun Mehta",
    role: "",
  },
];

export default function CurrentLandingPage() {
  return (
    <div data-website-variant-view="current" className="min-h-screen bg-background text-foreground">
      <WebsiteHeader />

      <section className="relative min-h-screen overflow-hidden pt-24">
        <div className="absolute inset-0">
          <img src={heroBg} alt="Atmospheric landscape" className="h-full w-full object-cover object-center opacity-45" />
          <div className="theme-hero-overlay absolute inset-0" />
        </div>

        <div className="museum-grid absolute inset-0 opacity-30" />

        <div className="theme-wide-shell relative mx-auto flex min-h-[calc(100vh-6rem)] flex-col justify-between px-4 pb-12 sm:px-6 lg:px-8">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="theme-reading-hero pt-20 md:pt-28">
            <div className="gold-kicker">Enterprise Carbon Intelligence</div>
            <h1 className="theme-hero-text theme-reading-hero headline-balance mt-8 text-5xl font-semibold leading-[0.96] md:text-7xl">
              Your energy data, clearly framed.
            </h1>
            <p className="theme-hero-copy theme-reading-xl mt-6 text-base leading-8 md:text-lg">
              Track emissions, optimize energy, model abatement cost, and execute sustainability strategy from one enterprise platform.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button size="lg" asChild>
                <Link to="/login">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={2}
            className="mt-16 grid gap-4 md:grid-cols-[0.8fr_1.2fr_1fr]"
          >
            {[
              { label: "Total Emissions", value: "12,450 tCO2", note: "Track portfolio carbon performance from one workspace" },
              { label: "Energy Saved", value: "2.4 GWh", note: "Monitor efficiency progress across sites and programs" },
              { label: "Cost Avoided", value: "$1.2M", note: "Connect carbon action to operational value" },
            ].map((item) => (
              <div key={item.label} className="section-frame p-5 theme-hero-text">
                <div className="text-[11px] uppercase tracking-[0.24em] text-primary">{item.label}</div>
                <div className="mt-3 text-3xl font-semibold">{item.value}</div>
                <div className="theme-hero-copy mt-2 text-sm leading-6">{item.note}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="experience" className="theme-wide-shell mx-auto px-4 py-24 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={fadeUp} custom={0}>
            <div className="gold-kicker">Built for energy leaders</div>
            <h2 className="theme-reading-lg headline-balance mt-6 text-4xl font-semibold text-foreground md:text-5xl">
              Built for energy leaders
            </h2>
            <p className="theme-reading-lg mt-5 text-base leading-8 text-muted-foreground">
              The same core platform capabilities, presented with a consistent product message across both interface variants.
            </p>
            <div className="mt-8 grid gap-4">
              {milestones.map((item, index) => (
                <motion.div key={item.title} variants={fadeUp} custom={index + 1} className="section-frame p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/35 bg-primary/10 text-primary">
                      <span className="text-sm font-semibold">0{index + 1}</span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-foreground">{item.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.body}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={fadeUp} custom={1} className="image-panel h-[620px]">
            <div className="relative h-full">
              <img src={heroBg} alt="Landscape" className="h-full w-full object-cover object-center scale-110" />
              <div className="theme-image-overlay absolute inset-0" />
              <div className="absolute inset-x-0 bottom-0 p-8">
                <div className="gold-kicker">Platform preview</div>
                <p className="theme-hero-copy theme-reading-md mt-5 text-base leading-7">
                  Emissions analytics, energy monitoring, strategy planning, and governance all stay connected in one enterprise workspace.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="capabilities" className="theme-section-band border-y border-primary/10">
        <div className="theme-wide-shell mx-auto px-4 py-24 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} variants={fadeUp} custom={0} className="theme-reading-center mx-auto text-center">
            <div className="gold-kicker">Capabilities</div>
            <h2 className="theme-hero-text mt-6 text-4xl font-semibold md:text-5xl">Built for energy leaders</h2>
            <p className="theme-hero-copy mt-5 text-base leading-8">
              The same core platform capabilities, presented with consistent messaging across both interface variants.
            </p>
          </motion.div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {capabilities.map((item, index) => (
              <motion.div key={item.title} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeUp} custom={index}>
                <Card className="h-full bg-card/74">
                  <CardContent className="p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/35 bg-primary/10 text-primary">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <h3 className="theme-hero-text mt-5 text-[1.9rem] font-semibold">{item.title}</h3>
                    <p className="theme-hero-copy mt-3 text-sm leading-7">{item.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img src={heroBg} alt="Background texture" className="h-full w-full object-cover object-bottom" />
          <div className="theme-story-overlay absolute inset-0" />
        </div>

        <div className="theme-wide-shell relative mx-auto px-4 py-24 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-2">
            {testimonials.map((item, index) => (
              <motion.div key={item.author} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={index} className="section-frame p-8">
                <div className="text-primary">
                  <Waves className="h-6 w-6" />
                </div>
                <p className="mt-5 text-lg leading-8 text-foreground">“{item.quote}”</p>
                <div className="mt-8 border-t border-border/70 pt-5">
                  <div className="font-semibold text-foreground">{item.author}</div>
                  {item.role ? <div className="text-sm text-muted-foreground">{item.role}</div> : null}
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div id="contact" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2} className="section-frame mt-16 p-8 text-center md:p-12">
            <div className="gold-kicker mx-auto">Get started</div>
            <h2 className="mt-6 text-4xl font-semibold text-foreground md:text-5xl">Ready to transform your energy strategy?</h2>
            <p className="theme-reading-center mx-auto mt-5 text-base leading-8 text-muted-foreground">
              Join enterprise teams using EnergyOS to drive measurable decarbonization outcomes from one workspace.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Button size="lg" asChild>
                <Link to="/login">
                  Start Now
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="mailto:hello@energyos.local">Request a walkthrough</a>
              </Button>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                { icon: Compass, label: "Navigate", text: "Move from public overview to authenticated workspace with the same product story." },
                { icon: CheckCircle2, label: "Align", text: "Keep analytics, planning, and governance under one operating model." },
                { icon: BarChart3, label: "Operate", text: "Track emissions, energy, cost, and strategy from one platform." },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-border/70 bg-muted/25 p-5">
                  <item.icon className="mx-auto h-5 w-5 text-primary" />
                  <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">{item.label}</div>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <WebsiteFooter />
    </div>
  );
}
