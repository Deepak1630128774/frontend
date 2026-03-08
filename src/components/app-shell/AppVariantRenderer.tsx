import CommandAppLayout from "@/components/app-shell/variants/command/CommandAppLayout";
import CurrentAppLayout from "@/components/app-shell/variants/current/CurrentAppLayout";

import { useAppVariantSystem } from "./AppVariantProvider";

const APP_VARIANT_COMPONENTS = {
  current: CurrentAppLayout,
  command: CommandAppLayout,
} as const;

export function AppVariantRenderer({ children }: { children: React.ReactNode }) {
  const { activeAppVariant } = useAppVariantSystem();
  const VariantComponent = APP_VARIANT_COMPONENTS[activeAppVariant] ?? CurrentAppLayout;

  return <VariantComponent>{children}</VariantComponent>;
}
