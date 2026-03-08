import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { APP_VARIANTS } from "@/lib/app/app-variant-system";
import { clearAppVariantPreview, getAppVariantPreview, getStoredAppVariant, setStoredAppVariant } from "@/lib/app/app-variant-persistence";
import type { AppVariantId } from "@/lib/app/app-variant-types";

type AppVariantContextValue = {
  appVariant: AppVariantId;
  activeAppVariant: AppVariantId;
  appVariants: typeof APP_VARIANTS;
  setAppVariant: (variantId: AppVariantId) => void;
  isPreviewingAppVariant: boolean;
};

const AppVariantContext = createContext(null as AppVariantContextValue | null);

export function AppVariantProvider({ children }: { children: React.ReactNode }) {
  const [appVariant, setAppVariantState] = useState("current" as AppVariantId);
  const [previewVariant, setPreviewVariant] = useState(null as AppVariantId | null);

  useEffect(() => {
    setAppVariantState(getStoredAppVariant());
    const nextPreview = getAppVariantPreview();
    setPreviewVariant(nextPreview === "current" ? null : nextPreview);
  }, []);

  const activeAppVariant = previewVariant ?? appVariant;

  useEffect(() => {
    document.documentElement.dataset.appVariant = activeAppVariant;
  }, [activeAppVariant]);

  function setAppVariant(variantId: AppVariantId) {
    setPreviewVariant(null);
    clearAppVariantPreview();
    setAppVariantState(variantId);
    setStoredAppVariant(variantId);
  }

  const value = useMemo(
    () => ({
      appVariant,
      activeAppVariant,
      appVariants: APP_VARIANTS,
      setAppVariant,
      isPreviewingAppVariant: previewVariant !== null,
    }) as AppVariantContextValue,
    [activeAppVariant, appVariant, previewVariant],
  );

  return <AppVariantContext.Provider value={value}>{children}</AppVariantContext.Provider>;
}

export function useAppVariantSystem() {
  const context = useContext(AppVariantContext);

  if (!context) {
    throw new Error("useAppVariantSystem must be used within AppVariantProvider");
  }

  return context;
}
