import type { LucideIcon } from "lucide-react";
import { LoaderCircle, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

interface PageLoadingStateProps {
  title: string;
  description: string;
}

interface InlineStatusProps {
  state: "idle" | "loading" | "success";
  label: string;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Sparkles,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "theme-empty-state flex min-h-[220px] flex-col items-center justify-center rounded-[1.5rem] px-6 py-8 text-center",
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-5 text-xl font-semibold text-foreground">{title}</h3>
      <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">{description}</p>
      {actionLabel && onAction ? (
        <Button variant="outline" size="sm" className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function PageLoadingState({ title, description }: PageLoadingStateProps) {
  return (
    <Card>
      <CardContent className="space-y-8 p-6 md:p-8">
        <div className="space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Loading</div>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-4">
          <div className="space-y-4 xl:col-span-1">
            <Skeleton className="h-11 rounded-full" />
            <Skeleton className="h-24 rounded-[1.25rem]" />
            <Skeleton className="h-24 rounded-[1.25rem]" />
            <Skeleton className="h-24 rounded-[1.25rem]" />
          </div>
          <div className="space-y-4 xl:col-span-3">
            <Skeleton className="h-40 rounded-[1.75rem]" />
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-56 rounded-[1.75rem]" />
              <Skeleton className="h-56 rounded-[1.75rem]" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function InlineStatus({ state, label, className }: InlineStatusProps) {
  if (state === "idle" || !label) {
    return null;
  }

  return (
    <div
      className={cn(
        "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]",
        state === "loading"
          ? "border-primary/25 bg-primary/10 text-primary"
          : "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
        className,
      )}
    >
      {state === "loading" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
      <span>{label}</span>
    </div>
  );
}