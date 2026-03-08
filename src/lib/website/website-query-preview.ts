import type { WebsiteVariantId } from "./website-variant-types";

export function getVariantPreviewFromSearch(search: string) {
  const params = new URLSearchParams(search);
  return params.get("websiteVariant") ?? params.get("variant");
}

export function normalizeWebsiteVariantId(value?: string | null): WebsiteVariantId {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "editorial") {
    return "editorial";
  }

  return "current";
}
