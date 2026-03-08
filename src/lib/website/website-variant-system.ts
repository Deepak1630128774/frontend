import { getVariantPreviewFromSearch, normalizeWebsiteVariantId } from "./website-query-preview";
import type { WebsiteVariantId, WebsiteVariantOption } from "./website-variant-types";

export const WEBSITE_VARIANT_STORAGE_KEY = "energyos-website-variant";

export const WEBSITE_VARIANTS: WebsiteVariantOption[] = [
  {
    id: "current",
    label: "Elegant",
    description: "The elegant public website presentation with the original structure and pacing.",
  },
  {
    id: "editorial",
    label: "Classic",
    description: "The classic editorial public website variant layered on the same content and CTA flows.",
  },
];

export function getStoredWebsiteVariant() {
  return normalizeWebsiteVariantId(localStorage.getItem(WEBSITE_VARIANT_STORAGE_KEY));
}

export function setStoredWebsiteVariant(variantId: WebsiteVariantId) {
  localStorage.setItem(WEBSITE_VARIANT_STORAGE_KEY, variantId);
}

export function getWebsiteVariantPreview() {
  return normalizeWebsiteVariantId(getVariantPreviewFromSearch(window.location.search));
}

export function clearWebsiteVariantPreview() {
  const params = new URLSearchParams(window.location.search);

  if (!params.has("websiteVariant") && !params.has("variant")) {
    return;
  }

  params.delete("websiteVariant");
  params.delete("variant");

  const nextSearch = params.toString();
  const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
  window.history.replaceState(window.history.state, "", nextUrl);
}
