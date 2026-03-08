const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const SELECTED_ORG_SCOPE_KEY = "decarb_selected_org_scope";
const RESERVED_SUBDOMAINS = new Set(["www", "api", "admin", "app", "platform"]);

function getWorkspaceRequestHeaders(): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }

  const host = window.location.host.trim();
  const protocol = window.location.protocol.replace(":", "").trim();
  const headers: Record<string, string> = {};

  if (host) {
    headers["X-Workspace-Host"] = host;
  }

  if (protocol) {
    headers["X-Workspace-Proto"] = protocol;
  }

  return headers;
}

function getValidSelectedOrganizationId(): string | null {
  if (typeof window === "undefined") return null;
  const rawValue = localStorage.getItem(SELECTED_ORG_SCOPE_KEY);
  if (!rawValue) return null;

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < 1) {
    localStorage.removeItem(SELECTED_ORG_SCOPE_KEY);
    return null;
  }

  return String(parsed);
}

function isOrganizationWorkspaceHost(): boolean {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname.trim().toLowerCase();
  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") {
    return false;
  }

  const parts = hostname.split(".").filter(Boolean);
  if (parts.length >= 3) {
    return !RESERVED_SUBDOMAINS.has(parts[0]);
  }

  if (parts.length === 2 && parts[1] === "localhost") {
    return !RESERVED_SUBDOMAINS.has(parts[0]);
  }

  return false;
}

function defaultErrorMessage(status: number): string {
  if (status === 400) return "The request could not be completed. Please check the details and try again.";
  if (status === 401) return "Your session is not authorized for this action. Please sign in and try again.";
  if (status === 403) return "You do not have access to perform this action.";
  if (status === 404) return "The requested resource could not be found.";
  if (status === 409) return "This request conflicts with existing data. Please review the information and try again.";
  if (status === 422) return "Some of the submitted information is invalid. Please review the form and try again.";
  if (status === 429) return "Too many requests were sent. Please wait a moment and try again.";
  if (status >= 500) return "Something went wrong on the server. Please try again in a moment.";
  return "The request could not be completed. Please try again.";
}

async function request<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  let response: Response;
  const selectedOrganizationId = isOrganizationWorkspaceHost()
    ? null
    : getValidSelectedOrganizationId();

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...getWorkspaceRequestHeaders(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(selectedOrganizationId ? { "X-Selected-Organization-Id": selectedOrganizationId } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new Error("Unable to reach the server right now. Check your connection and try again.");
  }

  if (!response.ok) {
    let message = defaultErrorMessage(response.status);
    try {
      const payload = (await response.json()) as { detail?: string | { message?: string }; message?: string };
      const detailMessage = typeof payload?.detail === "string"
        ? payload.detail
        : payload?.detail?.message;
      if (detailMessage) {
        message = detailMessage;
      } else if (payload?.message) {
        message = payload.message;
      }
    } catch {
      try {
        const text = (await response.text()).trim();
        if (text) {
          message = text;
        }
      } catch {
        // no-op
      }
    }
    if (response.status >= 500 && message === defaultErrorMessage(response.status)) {
      message = "Something went wrong while processing your request. Please try again in a moment.";
    }
    if (payloadLikeHtml(message)) {
      message = "Something went wrong while processing your request. Please try again in a moment.";
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function payloadLikeHtml(value: string): boolean {
  const text = value.trim().toLowerCase();
  return text.startsWith("<!doctype html") || text.startsWith("<html");
}

export const api = {
  get: <T>(path: string, token?: string) => request<T>(path, undefined, token),
  post: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    }, token),
  put: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
    }, token),
  patch: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    }, token),
  del: <T>(path: string, token?: string) =>
    request<T>(path, {
      method: "DELETE",
    }, token),
  delWithBody: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, {
      method: "DELETE",
      body: JSON.stringify(body),
    }, token),
};
