import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type VariantToggleOption<T extends string> = {
  value: T;
  label: string;
};

type VariantTogglePillProps<T extends string> = {
  value: T;
  onValueChange: (value: T) => void;
  options: VariantToggleOption<T>[];
  size?: "sm" | "default";
  className?: string;
};

export function VariantTogglePill<T extends string>({ value, onValueChange, options, size = "default", className }: VariantTogglePillProps<T>) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue) {
          onValueChange(nextValue as T);
        }
      }}
      className={cn(
        "rounded-full border border-border/70 bg-card/60 p-1 shadow-[0_14px_36px_hsl(var(--shadow-color)/0.1)] backdrop-blur-xl",
        className,
      )}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          aria-label={option.label}
          className={cn(
            "rounded-full border-0 px-4 font-semibold uppercase tracking-[0.18em]",
            size === "sm" ? "h-8 min-w-[4.5rem] text-[10px]" : "h-10 min-w-[5.5rem] text-[11px]",
            "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-[0_14px_28px_hsl(var(--primary)/0.24)]",
            "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}