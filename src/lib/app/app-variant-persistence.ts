import type { AppVariantId } from "./app-variant-types";

export const APP_VARIANT_STORAGE_KEY = "energyos-app-variant";

export function normalizeAppVariantId(value?: string | null): AppVariantId {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "command") {
    return "command";
  }

  return "current";
}

export function getStoredAppVariant() {
  return normalizeAppVariantId(localStorage.getItem(APP_VARIANT_STORAGE_KEY));
}

export function setStoredAppVariant(variantId: AppVariantId) {
  localStorage.setItem(APP_VARIANT_STORAGE_KEY, variantId);
}

export function getAppVariantPreview() {
  const params = new URLSearchParams(window.location.search);
  return normalizeAppVariantId(params.get("appVariant"));
}

export function clearAppVariantPreview() {
  const params = new URLSearchParams(window.location.search);

  if (!params.has("appVariant")) {
    return;
  }

  params.delete("appVariant");

  const nextSearch = params.toString();
  const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
  window.history.replaceState(window.history.state, "", nextUrl);
}
