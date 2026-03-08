import { api } from "@/api/client";

const RESERVED_SUBDOMAINS = new Set(["www", "api", "admin", "app", "platform"]);
const PLACEHOLDER_WORKSPACE_IDENTIFIERS = new Set(["example", "gmail"]);
const TENANT_CONTEXT_CACHE_PREFIX = "energyos_tenant_context:";
const TENANT_CONTEXT_CACHE_TTL_MS = 60_000;

export interface TenantWorkspaceContext {
  scope: "platform" | "organization";
  organization_id: number | null;
  organization_name: string | null;
  organization_slug: string;
  is_active: boolean;
}

type CachedTenantWorkspaceContext = TenantWorkspaceContext & {
  cached_at: number;
};

function getTenantContextCacheKey(): string | null {
  if (typeof window === "undefined") return null;
  const host = window.location.host.trim().toLowerCase();
  return host ? `${TENANT_CONTEXT_CACHE_PREFIX}${host}` : null;
}

function readCachedTenantWorkspaceContext(): TenantWorkspaceContext | null {
  const cacheKey = getTenantContextCacheKey();
  if (!cacheKey || typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = sessionStorage.getItem(cacheKey);
    if (!rawValue) {
      return null;
    }
    const cached = JSON.parse(rawValue) as CachedTenantWorkspaceContext;
    if (!cached?.cached_at || Date.now() - cached.cached_at > TENANT_CONTEXT_CACHE_TTL_MS) {
      sessionStorage.removeItem(cacheKey);
      return null;
    }
    return {
      scope: cached.scope,
      organization_id: cached.organization_id,
      organization_name: cached.organization_name,
      organization_slug: cached.organization_slug,
      is_active: cached.is_active,
    };
  } catch {
    sessionStorage.removeItem(cacheKey);
    return null;
  }
}

function cacheTenantWorkspaceContext(context: TenantWorkspaceContext): void {
  const cacheKey = getTenantContextCacheKey();
  if (!cacheKey || typeof window === "undefined") {
    return;
  }

  const payload: CachedTenantWorkspaceContext = {
    ...context,
    cached_at: Date.now(),
  };
  sessionStorage.setItem(cacheKey, JSON.stringify(payload));
}

export async function fetchTenantWorkspaceContext(): Promise<TenantWorkspaceContext> {
  const cachedContext = readCachedTenantWorkspaceContext();
  if (cachedContext) {
    return cachedContext;
  }

  try {
    const context = await api.get<TenantWorkspaceContext>("/api/tenant-auth/context");
    cacheTenantWorkspaceContext(context);
    return context;
  } catch {
    const fallback = {
      scope: "platform",
      organization_id: null,
      organization_name: null,
      organization_slug: "",
      is_active: false,
    } satisfies TenantWorkspaceContext;
    cacheTenantWorkspaceContext(fallback);
    return fallback;
  }
}

export function slugifyTenantName(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "organization";
}

const LOCAL_TENANT_APP_PORT = "8080";

export function buildTenantWorkspaceUrl(subdomain: string, baseUrl?: string): string | null {
  const normalizedSubdomain = subdomain.trim().toLowerCase();
  if (!normalizedSubdomain) {
    return null;
  }

  const resolvedBaseUrl = baseUrl?.trim() || (typeof window !== "undefined" ? window.location.origin : "");
  if (!resolvedBaseUrl) {
    return null;
  }

  try {
    const parsed = new URL(resolvedBaseUrl);
    const scheme = parsed.protocol.replace(":", "") || "http";
    const hostname = parsed.hostname.trim().toLowerCase() || "localhost";

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      const port = `:${LOCAL_TENANT_APP_PORT}`;
      return `${scheme}://${normalizedSubdomain}.localhost${port}`;
    }

    const port = parsed.port ? `:${parsed.port}` : "";
    const hostParts = hostname.split(".").filter(Boolean);
    const baseHost = hostParts.length >= 2 ? hostParts.slice(-2).join(".") : hostname;
    return `${scheme}://${normalizedSubdomain}.${baseHost}${port}`;
  } catch {
    return null;
  }
}

export function buildPlatformSiteUrl(pathname = "/", baseUrl?: string): string | null {
  const resolvedBaseUrl = baseUrl?.trim() || (typeof window !== "undefined" ? window.location.origin : "");
  if (!resolvedBaseUrl) {
    return null;
  }

  try {
    const parsed = new URL(resolvedBaseUrl);
    const scheme = parsed.protocol.replace(":", "") || "http";
    const hostname = parsed.hostname.trim().toLowerCase() || "localhost";
    const port = parsed.port ? `:${parsed.port}` : "";

    let platformHost = hostname;
    if (hostname.endsWith(".localhost")) {
      platformHost = "localhost";
    } else {
      const hostParts = hostname.split(".").filter(Boolean);
      if (hostParts.length >= 3) {
        platformHost = hostParts.slice(-2).join(".");
      }
    }

    const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
    return `${scheme}://${platformHost}${port}${normalizedPath}`;
  } catch {
    return null;
  }
}

export function getTenantSlugFromHostname(hostname?: string): string | null {
  const value = (hostname ?? (typeof window !== "undefined" ? window.location.hostname : "")).trim().toLowerCase();
  if (!value || value === "localhost" || value === "127.0.0.1") {
    return null;
  }

  const parts = value.split(".").filter(Boolean);
  if (parts.length >= 3) {
    const subdomain = parts[0];
    return RESERVED_SUBDOMAINS.has(subdomain) ? null : subdomain;
  }

  if (parts.length === 2 && parts[1] === "localhost") {
    const subdomain = parts[0];
    return RESERVED_SUBDOMAINS.has(subdomain) ? null : subdomain;
  }

  return null;
}

export function formatTenantName(tenantSlug: string): string {
  return tenantSlug
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeWorkspaceIdentity(value?: string | null): string {
  return String(value ?? "").trim().toLowerCase();
}

export function isPlaceholderWorkspaceIdentity(value?: string | null): boolean {
  const normalizedValue = normalizeWorkspaceIdentity(value);
  return normalizedValue ? PLACEHOLDER_WORKSPACE_IDENTIFIERS.has(normalizedValue) : false;
}

export function getPlatformWorkspaceLabel(role?: string | null): string {
  const normalizedRole = String(role ?? "").trim().toLowerCase();
  if (normalizedRole === "owner" || normalizedRole === "super_admin") {
    return "Owner Workspace";
  }
  return "Platform Workspace";
}

export function isOrganizationWorkspaceContext({
  organizationName,
  organizationSlug,
  tenantScope,
}: {
  organizationName?: string | null;
  organizationSlug?: string | null;
  tenantScope?: string | null;
}): boolean {
  if (String(tenantScope ?? "").trim().toLowerCase() === "organization") {
    return true;
  }

  const hasOrganizationName = Boolean(organizationName?.trim() && !isPlaceholderWorkspaceIdentity(organizationName));
  const hasOrganizationSlug = Boolean(organizationSlug?.trim() && !isPlaceholderWorkspaceIdentity(organizationSlug));
  return hasOrganizationName || hasOrganizationSlug;
}

export function getWorkspaceDisplayName({
  role,
  organizationName,
  organizationSlug,
  tenantScope,
}: {
  role?: string | null;
  organizationName?: string | null;
  organizationSlug?: string | null;
  tenantScope?: string | null;
}): string {
  if (isOrganizationWorkspaceContext({ organizationName, organizationSlug, tenantScope })) {
    const trimmedName = organizationName?.trim();
    if (trimmedName && !isPlaceholderWorkspaceIdentity(trimmedName)) {
      return trimmedName;
    }

    const trimmedSlug = organizationSlug?.trim();
    if (trimmedSlug && !isPlaceholderWorkspaceIdentity(trimmedSlug)) {
      return formatTenantName(trimmedSlug);
    }
  }

  return getPlatformWorkspaceLabel(role);
}