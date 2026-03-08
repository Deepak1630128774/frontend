import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { api } from "./api/client";
import { fetchTenantWorkspaceContext } from "./lib/tenant";
import { normalizeThemeId } from "./lib/theme-system";

type Role = "owner" | "super_admin" | "buyer_admin" | "org_admin" | "org_user";
type PermissionAction = "view" | "create" | "edit" | "delete" | "approve" | "assign" | "evaluate";
type PermissionColumn = `can_${PermissionAction}`;

interface AuthUser {
  id: number;
  organization_id: number | null;
  effective_organization_id?: number | null;
  full_name: string;
  email: string;
  role: Role;
  organization_name?: string;
  organization_slug?: string;
  effective_organization_name?: string;
  effective_organization_slug?: string;
  selected_organization_id?: number | null;
  selected_organization_name?: string;
  selected_organization_slug?: string;
  tenant_context?: {
    scope: "platform" | "organization";
    host: string;
    organization_id?: number | null;
    organization_slug?: string;
  };
}

interface PermissionFlags {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_assign: boolean;
  can_evaluate: boolean;
}

interface ModulePermission extends PermissionFlags {
  module_key: string;
  module_name?: string;
}

interface ProjectPermission extends PermissionFlags {
  module_key: string;
  project_id: string;
  project_name?: string;
  owner_user_id?: number;
}

interface SubEntityPermission extends PermissionFlags {
  module_key: string;
  project_id: string;
  sub_entity_key: string;
  sub_entity_id: string;
}

interface UserProfileSettings {
  font_size: string;
  color_theme: string;
  dark_mode: boolean | number;
}

interface AccessContext {
  projectId?: string;
  subEntityKey?: string;
  subEntityId?: string;
}

interface OrganizationOption {
  id: number;
  name: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  profile: UserProfileSettings;
  modulePermissions: ModulePermission[];
  projectPermissions: ProjectPermission[];
  subEntityPermissions: SubEntityPermission[];
  ownedProjects: Array<{ module_key: string; project_id: string }>;
  loading: boolean;
  organizationOptions: OrganizationOption[];
  selectedOrganizationId: number | null;
  selectedOrganizationName: string;
  requiresOrganizationSelection: boolean;
  hasOrganizationDataScope: boolean;
  setSelectedOrganizationId: (organizationId: number | null) => void;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  loginWithToken: (authToken: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
  setProfileSettings: (next: Partial<UserProfileSettings>) => Promise<void>;
  canModule: (moduleKey: string, action?: PermissionAction) => boolean;
  canProject: (moduleKey: string, projectId: string, action?: PermissionAction) => boolean;
  canSubEntity: (
    moduleKey: string,
    projectId: string,
    subEntityKey: string,
    subEntityId: string,
    action?: PermissionAction
  ) => boolean;
  can: (moduleKey: string, buttonOrAction: string, context?: AccessContext) => boolean;
}

const AuthContext = createContext(null as AuthState | null);

const TOKEN_LOCAL_KEY = "decarb_token_local";
const TOKEN_SESSION_KEY = "decarb_token_session";
const SELECTED_ORG_SCOPE_KEY = "decarb_selected_org_scope";

const DEFAULT_PROFILE: UserProfileSettings = {
  font_size: "medium",
  color_theme: "default",
  dark_mode: false,
};

function isSuperAdmin(user: AuthUser | null) {
  if (!user) return false;
  return user.role === "owner" || user.role === "super_admin";
}

function parseStoredOrganizationId(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return null;
  return parsed;
}

function permissionColumn(action: PermissionAction): PermissionColumn {
  return `can_${action}`;
}

function normalizeFlags(row: {
  can_view?: unknown;
  can_create?: unknown;
  can_edit?: unknown;
  can_delete?: unknown;
  can_approve?: unknown;
  can_assign?: unknown;
  can_evaluate?: unknown;
}): PermissionFlags {
  return {
    can_view: Boolean(row.can_view),
    can_create: Boolean(row.can_create),
    can_edit: Boolean(row.can_edit),
    can_delete: Boolean(row.can_delete),
    can_approve: Boolean(row.can_approve),
    can_assign: Boolean(row.can_assign),
    can_evaluate: Boolean(row.can_evaluate),
  };
}

function mapLegacyButtonToAction(buttonOrAction: string): PermissionAction {
  const value = buttonOrAction.trim().toLowerCase();
  if (value === "view") return "view";
  if (value === "create" || value === "new") return "create";
  if (value === "edit" || value === "save" || value === "yearly_save" || value === "tracking_save") return "edit";
  if (value === "delete") return "delete";
  if (value === "approve" || value === "status") return "approve";
  if (value === "assign" || value === "permissions") return "assign";
  if (value === "evaluate" || value === "compute" || value === "analyze" || value === "calculate") return "evaluate";
  return "view";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const localToken = localStorage.getItem(TOKEN_LOCAL_KEY);
  const sessionToken = sessionStorage.getItem(TOKEN_SESSION_KEY);
  const storedSelectedOrganizationId = parseStoredOrganizationId(localStorage.getItem(SELECTED_ORG_SCOPE_KEY));
  const [token, setToken] = useState(localToken ?? sessionToken ?? null);
  const [persistToken, setPersistToken] = useState(Boolean(localToken));
  const [user, setUser] = useState(null as AuthUser | null);
  const [profile, setProfile] = useState(DEFAULT_PROFILE as UserProfileSettings);
  const [modulePermissions, setModulePermissions] = useState([] as ModulePermission[]);
  const [projectPermissions, setProjectPermissions] = useState([] as ProjectPermission[]);
  const [subEntityPermissions, setSubEntityPermissions] = useState([] as SubEntityPermission[]);
  const [ownedProjects, setOwnedProjects] = useState([] as Array<{ module_key: string; project_id: string }>);
  const [organizationOptions, setOrganizationOptions] = useState([] as OrganizationOption[]);
  const [selectedOrganizationIdState, setSelectedOrganizationIdState] = useState(storedSelectedOrganizationId);
  const [loading, setLoading] = useState(true);

  const tenantLockedOrganizationId = isSuperAdmin(user) && user?.tenant_context?.scope === "organization"
    ? user.tenant_context.organization_id ?? null
    : null;
  const ownerWorkspaceOrganizationId = isSuperAdmin(user)
    ? user?.effective_organization_id ?? user?.organization_id ?? null
    : null;
  const selectedOrganizationId = tenantLockedOrganizationId ?? selectedOrganizationIdState;
  const selectedOrganizationName = useMemo(() => {
    const optionName = organizationOptions.find((row) => row.id === selectedOrganizationId)?.name?.trim();
    if (optionName) return optionName;
    if (selectedOrganizationId && user?.selected_organization_id === selectedOrganizationId && user.selected_organization_name?.trim()) {
      return user.selected_organization_name.trim();
    }
    if (!isSuperAdmin(user) && user?.effective_organization_name?.trim()) {
      return user.effective_organization_name.trim();
    }
    return "";
  }, [organizationOptions, selectedOrganizationId, user]);
  const requiresOrganizationSelection = isSuperAdmin(user) && user?.tenant_context?.scope !== "organization";
  const hasOrganizationDataScope = isSuperAdmin(user)
    ? selectedOrganizationId !== null
    : Boolean(user?.organization_id ?? user?.tenant_context?.organization_id ?? null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        await refreshMeInternal(token, persistToken);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  useEffect(() => {
    document.documentElement.dataset.fontSize = String(profile.font_size || "medium");
  }, [profile.font_size]);

  useEffect(() => {
    if (!user) {
      setOrganizationOptions([]);
      setSelectedOrganizationIdState(null);
      localStorage.removeItem(SELECTED_ORG_SCOPE_KEY);
      return;
    }

    if (!isSuperAdmin(user)) {
      setOrganizationOptions([]);
      setSelectedOrganizationIdState(null);
      localStorage.removeItem(SELECTED_ORG_SCOPE_KEY);
      return;
    }

    if (tenantLockedOrganizationId !== null) {
      setSelectedOrganizationIdState(tenantLockedOrganizationId);
      localStorage.setItem(SELECTED_ORG_SCOPE_KEY, String(tenantLockedOrganizationId));
      return;
    }

    const storedValue = parseStoredOrganizationId(localStorage.getItem(SELECTED_ORG_SCOPE_KEY));
    if (storedValue !== selectedOrganizationIdState) {
      setSelectedOrganizationIdState(storedValue);
    }
  }, [selectedOrganizationIdState, tenantLockedOrganizationId, user]);

  useEffect(() => {
    if (!token || !isSuperAdmin(user)) {
      setOrganizationOptions([]);
      return;
    }

    let cancelled = false;
    void api
      .get<Array<{ id: number; name: string }>>("/api/admin/organizations", token)
      .then((rows) => {
        if (cancelled) return;
        const nextOptions = (rows ?? [])
          .map((row) => ({ id: Number(row.id), name: String(row.name ?? "") }))
          .filter((row) => Number.isInteger(row.id) && row.id > 0)
          .flatMap((row) => {
            const normalizedName = row.name.trim().toLowerCase();
            const isPlaceholder = normalizedName === "example" || normalizedName === "gmail";
            if (row.id === ownerWorkspaceOrganizationId) {
              return [{ id: row.id, name: "Owner Workspace" }];
            }
            return isPlaceholder ? [] : [row];
          });
        setOrganizationOptions(nextOptions);
      })
      .catch(() => {
        if (cancelled) return;
        setOrganizationOptions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [ownerWorkspaceOrganizationId, token, user]);

  useEffect(() => {
    if (!isSuperAdmin(user) || tenantLockedOrganizationId !== null || selectedOrganizationIdState === null) {
      return;
    }
    if (organizationOptions.length === 0) {
      return;
    }
    const stillExists = organizationOptions.some((row) => row.id === selectedOrganizationIdState);
    if (stillExists) {
      return;
    }
    setSelectedOrganizationIdState(null);
    localStorage.removeItem(SELECTED_ORG_SCOPE_KEY);
  }, [organizationOptions, selectedOrganizationIdState, tenantLockedOrganizationId, user]);

  function storeToken(authToken: string, rememberMe: boolean) {
    if (rememberMe) {
      localStorage.setItem(TOKEN_LOCAL_KEY, authToken);
      sessionStorage.removeItem(TOKEN_SESSION_KEY);
    } else {
      sessionStorage.setItem(TOKEN_SESSION_KEY, authToken);
      localStorage.removeItem(TOKEN_LOCAL_KEY);
    }
  }

  async function refreshMeInternal(authToken: string, rememberMe: boolean) {
    storeToken(authToken, rememberMe);
    setPersistToken(rememberMe);
    const data = await api.get<{
      user: AuthUser;
      profile?: UserProfileSettings;
      module_permissions?: ModulePermission[];
      project_permissions?: ProjectPermission[];
      sub_entity_permissions?: SubEntityPermission[];
      owned_projects?: Array<{ module_key: string; project_id: string }>;
    }>("/api/auth/me", authToken);
    setUser(data.user);
    setProfile({
      ...DEFAULT_PROFILE,
      ...(data.profile ?? {}),
      color_theme: normalizeThemeId(data.profile?.color_theme),
      dark_mode: Boolean(data.profile?.dark_mode),
    });
    setModulePermissions((data.module_permissions ?? []).map((row) => ({ ...row, ...normalizeFlags(row) })));
    setProjectPermissions((data.project_permissions ?? []).map((row) => ({ ...row, ...normalizeFlags(row) })));
    setSubEntityPermissions((data.sub_entity_permissions ?? []).map((row) => ({ ...row, ...normalizeFlags(row) })));
    setOwnedProjects(data.owned_projects ?? []);
  }

  async function login(email: string, password: string, rememberMe = true) {
    const tenantContext = await fetchTenantWorkspaceContext();
    const loginPath = tenantContext.scope === "organization" ? "/api/tenant-auth/login" : "/api/auth/login";
    const response = await api.post<{
      access_token: string;
      user: AuthUser;
      token_type: string;
    }>(loginPath, { email, password });
    setToken(response.access_token);
    await refreshMeInternal(response.access_token, rememberMe);
  }

  async function loginWithToken(authToken: string, rememberMe = true) {
    setToken(authToken);
    await refreshMeInternal(authToken, rememberMe);
  }

  async function refreshMe() {
    if (!token) return;
    await refreshMeInternal(token, persistToken);
  }

  async function setProfileSettings(next: Partial<UserProfileSettings>) {
    if (!token) return;
    const merged: UserProfileSettings = {
      ...profile,
      ...next,
      color_theme: normalizeThemeId(next.color_theme ?? profile.color_theme),
    };
    setProfile({
      ...merged,
      dark_mode: Boolean(merged.dark_mode),
    });
    await api.put("/api/admin/profile/me", {
      font_size: merged.font_size,
      color_theme: merged.color_theme,
      dark_mode: Boolean(merged.dark_mode),
    }, token);
  }

  function logout() {
    localStorage.removeItem(TOKEN_LOCAL_KEY);
    localStorage.removeItem(SELECTED_ORG_SCOPE_KEY);
    sessionStorage.removeItem(TOKEN_SESSION_KEY);
    setToken(null);
    setUser(null);
    setProfile(DEFAULT_PROFILE);
    setModulePermissions([]);
    setProjectPermissions([]);
    setSubEntityPermissions([]);
    setOwnedProjects([]);
    setOrganizationOptions([]);
    setSelectedOrganizationIdState(null);
  }

  function setSelectedOrganizationId(organizationId: number | null) {
    if (!isSuperAdmin(user) || tenantLockedOrganizationId !== null) {
      return;
    }
    const normalizedOrganizationId = organizationId !== null && Number.isInteger(organizationId) && organizationId > 0
      ? organizationId
      : null;
    setSelectedOrganizationIdState(normalizedOrganizationId);
    if (normalizedOrganizationId === null) {
      localStorage.removeItem(SELECTED_ORG_SCOPE_KEY);
      return;
    }
    localStorage.setItem(SELECTED_ORG_SCOPE_KEY, String(normalizedOrganizationId));
  }

  function canModule(moduleKey: string, action: PermissionAction = "view") {
    if (!user) return false;
    if (moduleKey.trim().toLowerCase() === "profile") return true;
    if (isSuperAdmin(user)) return true;
    const key = moduleKey.trim().toLowerCase();
    const col = permissionColumn(action);
    const moduleHit = modulePermissions.find((p) => p.module_key.toLowerCase() === key);
    if (moduleHit && Boolean(moduleHit[col])) return true;
    if (action === "view") {
      const owned = ownedProjects.some((row) => row.module_key === key);
      if (owned) return true;
      const projectLevel = projectPermissions.some((p) => p.module_key.toLowerCase() === key && p.can_view);
      if (projectLevel) return true;
      const subLevel = subEntityPermissions.some((p) => p.module_key.toLowerCase() === key && p.can_view);
      if (subLevel) return true;
    }
    return false;
  }

  function canProject(moduleKey: string, projectId: string, action: PermissionAction = "view") {
    if (!user) return false;
    if (isSuperAdmin(user)) return true;
    const key = moduleKey.trim().toLowerCase();
    const project = projectId.trim();
    if (!project) return canModule(key, action);
    const col = permissionColumn(action);
    const isOwned = ownedProjects.some((row) => row.module_key === key && row.project_id === project);
    if (isOwned) return true;
    const hit = projectPermissions.find((p) => p.module_key.toLowerCase() === key && p.project_id === project);
    if (hit) return Boolean(hit[col]);
    return canModule(key, action);
  }

  function canSubEntity(
    moduleKey: string,
    projectId: string,
    subEntityKey: string,
    subEntityId: string,
    action: PermissionAction = "view"
  ) {
    if (!user) return false;
    if (isSuperAdmin(user)) return true;
    const key = moduleKey.trim().toLowerCase();
    const project = projectId.trim();
    const subKey = subEntityKey.trim().toLowerCase();
    const subId = subEntityId.trim();
    const col = permissionColumn(action);
    const hit = subEntityPermissions.find(
      (p) =>
        p.module_key.toLowerCase() === key &&
        p.project_id === project &&
        p.sub_entity_key.toLowerCase() === subKey &&
        p.sub_entity_id === subId
    );
    if (hit) return Boolean(hit[col]);
    return canProject(key, project, action);
  }

  function can(moduleKey: string, buttonOrAction: string, context?: AccessContext) {
    const action = mapLegacyButtonToAction(buttonOrAction);
    if (context?.projectId && context?.subEntityKey && context?.subEntityId) {
      return canSubEntity(moduleKey, context.projectId, context.subEntityKey, context.subEntityId, action);
    }
    if (context?.projectId) {
      return canProject(moduleKey, context.projectId, action);
    }
    return canModule(moduleKey, action);
  }

  const value: AuthState = useMemo(
    () => ({
      token,
      user,
      profile,
      modulePermissions,
      projectPermissions,
      subEntityPermissions,
      ownedProjects,
      loading,
      organizationOptions,
      selectedOrganizationId,
      selectedOrganizationName,
      requiresOrganizationSelection,
      hasOrganizationDataScope,
      setSelectedOrganizationId,
      login,
      loginWithToken,
      logout,
      refreshMe,
      setProfileSettings,
      canModule,
      canProject,
      canSubEntity,
      can,
    }),
    [
      token,
      user,
      profile,
      modulePermissions,
      projectPermissions,
      subEntityPermissions,
      ownedProjects,
      loading,
      organizationOptions,
      selectedOrganizationId,
      selectedOrganizationName,
      requiresOrganizationSelection,
      hasOrganizationDataScope,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
