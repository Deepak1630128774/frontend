import { useAppVariantSystem } from "@/components/app-shell/AppVariantProvider";
import { VariantTogglePill } from "@/components/variants/VariantTogglePill";
import { useWebsiteVariantSystem } from "@/components/website/WebsiteVariantProvider";

export function ExperienceVariantToggle({ size = "default", className }: { size?: "sm" | "default"; className?: string }) {
  const { activeAppVariant, isPreviewingAppVariant, setAppVariant } = useAppVariantSystem();
  const { activeWebsiteVariant, isPreviewingWebsiteVariant, setWebsiteVariant } = useWebsiteVariantSystem();

  const value = activeAppVariant === "current" && activeWebsiteVariant === "current" ? "old" : "new";
  const isPreviewing = isPreviewingAppVariant || isPreviewingWebsiteVariant;

  function onValueChange(nextValue: "old" | "new") {
    if (nextValue === "old") {
      setAppVariant("current");
      setWebsiteVariant("current");
      return;
    }

    setAppVariant("command");
    setWebsiteVariant("editorial");
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <VariantTogglePill
        value={value}
        onValueChange={(nextValue) => onValueChange(nextValue as "old" | "new")}
        options={[
          { value: "old", label: "Elegant" },
          { value: "new", label: "Classic" },
        ]}
        size={size}
        className={className}
      />
      {isPreviewing ? <div className="text-xs font-medium text-primary">Previewing from query parameter</div> : null}
    </div>
  );
}