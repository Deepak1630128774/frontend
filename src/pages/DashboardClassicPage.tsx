import { Calendar, Download, FileText, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const summaryCards = [
  { label: "Total Projects", value: "24" },
  { label: "Active Sites", value: "12" },
  { label: "Emission Alerts", value: "3" },
  { label: "Pending Reviews", value: "6" },
];

const projectRows = [
  { code: "PRJ-1024", name: "Boiler Retrofit", owner: "Plant East", status: "Active", due: "28 Mar 2026" },
  { code: "PRJ-1028", name: "Solar Expansion", owner: "Grid Team", status: "Review", due: "02 Apr 2026" },
  { code: "PRJ-1031", name: "Fleet Shift EV", owner: "Logistics", status: "Active", due: "15 Apr 2026" },
  { code: "PRJ-1035", name: "Cooling Upgrade", owner: "Plant West", status: "Planned", due: "30 Apr 2026" },
  { code: "PRJ-1040", name: "Steam Recovery", owner: "Facilities", status: "Review", due: "08 May 2026" },
];

const recentActivity = [
  { title: "PRJ-1024 moved to Active", time: "10 mins ago" },
  { title: "Q1 emissions file uploaded", time: "42 mins ago" },
  { title: "New review requested for PRJ-1028", time: "1 hour ago" },
  { title: "Plant West data sync completed", time: "Today" },
];

const classicPanelClassName = "rounded-sm border border-border/80 bg-card p-4 shadow-none";

export default function DashboardClassicPage() {
  return (
    <div className="space-y-4">
      <section className={cn(classicPanelClassName, "p-5")} style={{ fontFamily: "var(--font-mono)" }}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Classic Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Simple old-school layout with sidebar navigation and operational tables.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="rounded-sm">
              <Calendar className="mr-2 h-4 w-4" />
              March 2026
            </Button>
            <Button variant="outline" className="rounded-sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button className="rounded-sm">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className={classicPanelClassName} style={{ fontFamily: "var(--font-mono)" }}>
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{card.label}</div>
            <div className="mt-2 text-3xl font-semibold">{card.value}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <div className={cn(classicPanelClassName, "p-5")} style={{ fontFamily: "var(--font-mono)" }}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold">Projects</h2>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="rounded-sm pl-9" placeholder="Search projects..." />
            </div>
          </div>

          <div className="rounded-sm border border-border/70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectRows.map((row) => (
                  <TableRow key={row.code}>
                    <TableCell className="font-medium">{row.code}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.owner}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{row.due}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-4">
          <div className={cn(classicPanelClassName, "p-5")} style={{ fontFamily: "var(--font-mono)" }}>
            <h2 className="text-xl font-semibold">Recent Activity</h2>
            <div className="mt-3 space-y-2">
              {recentActivity.map((item) => (
                <div key={item.title} className="rounded-sm border border-border/70 bg-muted/25 p-3">
                  <div className="text-sm font-medium">{item.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{item.time}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={cn(classicPanelClassName, "p-5")} style={{ fontFamily: "var(--font-mono)" }}>
            <h2 className="text-xl font-semibold">Quick Notes</h2>
            <div className="mt-3 space-y-2 text-sm">
              <div className="rounded-sm border border-border/70 bg-muted/25 p-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Review pending approvals before Friday.</span>
                </div>
              </div>
              <div className="rounded-sm border border-border/70 bg-muted/25 p-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Upload updated plant meter readings.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
