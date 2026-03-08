import EditorialLandingPage from "@/components/website/variants/editorial/EditorialLandingPage";
import CurrentLandingPage from "@/components/website/variants/current/CurrentLandingPage";

import { useWebsiteVariantSystem } from "./WebsiteVariantProvider";

const WEBSITE_VARIANT_COMPONENTS = {
  current: CurrentLandingPage,
  editorial: EditorialLandingPage,
} as const;

export function WebsiteVariantRenderer() {
  const { activeWebsiteVariant } = useWebsiteVariantSystem();
  const VariantComponent = WEBSITE_VARIANT_COMPONENTS[activeWebsiteVariant] ?? CurrentLandingPage;

  return <VariantComponent />;
}
