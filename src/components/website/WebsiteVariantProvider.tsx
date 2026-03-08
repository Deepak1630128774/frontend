import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { WEBSITE_VARIANTS, clearWebsiteVariantPreview, getStoredWebsiteVariant, setStoredWebsiteVariant, getWebsiteVariantPreview } from "@/lib/website/website-variant-system";
import type { WebsiteVariantId } from "@/lib/website/website-variant-types";

type WebsiteVariantContextValue = {
  websiteVariant: WebsiteVariantId;
  activeWebsiteVariant: WebsiteVariantId;
  websiteVariants: typeof WEBSITE_VARIANTS;
  setWebsiteVariant: (variantId: WebsiteVariantId) => void;
  isPreviewingWebsiteVariant: boolean;
};

const WebsiteVariantContext = createContext<WebsiteVariantContextValue | null>(null);

export function WebsiteVariantProvider({ children }: { children: React.ReactNode }) {
  const [websiteVariant, setWebsiteVariantState] = useState<WebsiteVariantId>("current");
  const [previewVariant, setPreviewVariant] = useState<WebsiteVariantId | null>(null);

  useEffect(() => {
    setWebsiteVariantState(getStoredWebsiteVariant());
    const nextPreview = getWebsiteVariantPreview();
    setPreviewVariant(nextPreview === "current" ? null : nextPreview);
  }, []);

  const activeWebsiteVariant = previewVariant ?? websiteVariant;

  useEffect(() => {
    document.documentElement.dataset.websiteVariant = activeWebsiteVariant;
  }, [activeWebsiteVariant]);

  function setWebsiteVariant(variantId: WebsiteVariantId) {
    setPreviewVariant(null);
    clearWebsiteVariantPreview();
    setWebsiteVariantState(variantId);
    setStoredWebsiteVariant(variantId);
  }

  const value = useMemo<WebsiteVariantContextValue>(
    () => ({
      websiteVariant,
      activeWebsiteVariant,
      websiteVariants: WEBSITE_VARIANTS,
      setWebsiteVariant,
      isPreviewingWebsiteVariant: previewVariant !== null,
    }),
    [activeWebsiteVariant, previewVariant, websiteVariant],
  );

  return <WebsiteVariantContext.Provider value={value}>{children}</WebsiteVariantContext.Provider>;
}

export function useWebsiteVariantSystem() {
  const context = useContext(WebsiteVariantContext);

  if (!context) {
    throw new Error("useWebsiteVariantSystem must be used within WebsiteVariantProvider");
  }

  return context;
}
