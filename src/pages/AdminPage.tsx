import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/auth";
import { useAppVariantSystem } from "@/components/app-shell/AppVariantProvider";
import { api } from "@/api/client";
import { EmptyState, InlineStatus, PageLoadingState } from "@/components/state-panel";
import { ADMIN_SECTION_ITEMS, DEFAULT_ADMIN_SECTION_PATH, getAdminSectionFromPath } from "@/lib/admin-sections";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useThemeSystem } from "@/components/theme/ThemeProvider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buildTenantWorkspaceUrl } from "@/lib/tenant";
import { getWorkspacePageLayoutForVariant } from "@/lib/theme-page-layout";
import { cn } from "@/lib/utils";
import { AlertTriangle, Building2, ChevronDown, Eye, MailPlus, RefreshCcw, Send, ShieldCheck, Trash2, Users } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

interface UserRow {
  id: number;
  organization_id: number | null;
  organization_name?: string | null;
  organization_slug?: string | null;
  full_name: string;
  email: string;
  role: string;
  effective_role?: string;
  membership_role?: string | null;
  membership_status?: string | null;
  role_scope?: "organization" | "platform";
  is_active: number;
  is_approved: number;
  created_at: string;
  updated_at?: string;
}

interface ModuleRow {
  id?: number;
  module_key: string;
  module_name: string;
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

interface ModuleAccessRow extends PermissionFlags {
  module_key: string;
  module_name: string;
}

interface ProjectRow {
  id: number;
  external_project_id: string;
  project_name: string;
  owner_user_id: number;
  organization_id: number | null;
}

interface SubEntityRow {
  id: number;
  sub_entity_key: string;
  external_sub_entity_id: string;
  sub_entity_name: string;
}

interface PreviewResultRow {
  granted: boolean;
  source: string;
  action: string;
  project_id: string;
  project_label: string;
  sub_entity_id: string;
  sub_entity_label: string;
  result_key: string;
}

interface AuditRow {
  id: number;
  action: string;
  module_key?: string;
  project_id?: string;
  actor_email?: string;
  details: Record<string, unknown>;
  created_at: string;
}

interface PendingOrganizationRow {
  id: number;
  name: string;
  slug: string;
  purchaser_email: string;
  status: string;
  approval_status: string;
  status_note?: string;
  created_at: string;
  purchase_reference?: string;
  admin_user_id?: number;
  admin_full_name?: string;
  admin_email?: string;
}

interface PendingPlatformUserRow {
  id: number;
  full_name: string;
  email: string;
  role: string;
  signup_type: string;
  created_at: string;
  updated_at: string;
}

interface OwnerHierarchyResponse {
  summary: {
    pending_organizations: number;
    approved_organizations: number;
    rejected_organizations: number;
    pending_platform_users: number;
    approved_platform_users: number;
  };
  organizations: Array<{
    id: number;
    name: string;
    slug: string;
    status: string;
    approval_status: string;
    created_at: string;
    admin_count: number;
    user_count: number;
  }>;
}

interface InvitationRow {
  id: number;
  organization_id: number;
  organization_name: string;
  email: string;
  full_name: string;
  role: string;
  expires_at: string;
  status: string;
  created_at: string;
}

type InvitationExpiryOption = "1" | "3" | "7" | "14" | "30" | "never" | "custom";

interface PendingOrganizationMemberSignupRow {
  id: number;
  organization_id: number;
  organization_name: string;
  organization_slug: string;
  full_name: string;
  email: string;
  requested_role: string;
  status: string;
  review_note?: string;
  created_at: string;
  updated_at: string;
}

interface OrganizationRemovalCandidate {
  organizationId: number;
  organizationName: string;
  organizationSlug: string;
  adminName: string;
  adminEmail: string;
  memberCount: number;
  workspaceUrl: string | null;
}

const PERMISSION_KEYS: Array<keyof PermissionFlags> = [
  "can_view",
  "can_create",
  "can_edit",
  "can_delete",
  "can_approve",
  "can_assign",
  "can_evaluate",
];

const PREVIEW_ACTION_OPTIONS = PERMISSION_KEYS.map((key) => key.replace("can_", ""));

const roleColors: Record<string, string> = {
  owner: "bg-destructive/15 text-destructive border-destructive/30",
  super_admin: "bg-destructive/15 text-destructive border-destructive/30",
  org_admin: "bg-accent/15 text-accent border-accent/30",
  buyer_admin: "bg-accent/15 text-accent border-accent/30",
  org_user: "bg-primary/15 text-primary border-primary/30",
};

function getDisplayRole(row: UserRow): string {
  const value = (row.effective_role || row.role || "").trim().toLowerCase();
  if (value === "buyer_admin") return "org_admin";
  return value;
}

function getRoleLabel(role: string): string {
  if (role === "owner") return "Owner";
  if (role === "super_admin") return "Super Admin";
  if (role === "org_admin") return "Organization Admin";
  if (role === "org_user") return "Organization User";
  return role.replace(/_/g, " ");
}

function getRoleSupportText(row: UserRow): string {
  const displayRole = getDisplayRole(row);
  if (displayRole === "org_admin") {
    return row.organization_name ? `Leads access for ${row.organization_name}` : "Leads access for an organization workspace";
  }
  if (displayRole === "org_user") {
    return row.organization_name ? `Member in ${row.organization_name}` : "Organization workspace member";
  }
  if (displayRole === "super_admin") return "Cross-organization platform governance";
  if (displayRole === "owner") return "Full platform ownership";
  return row.role_scope === "organization" ? "Organization-scoped account" : "Platform-scoped account";
}

function getOrganizationLabel(row: UserRow): string {
  if (row.role_scope !== "organization") return "Platform";
  return row.organization_name || "Organization workspace";
}

function formatInvitationExpiry(value: string): string {
  if (value.startsWith("9999-12-31")) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function toggleSelection(current: string[], value: string, checked: boolean) {
  if (checked) {
    return current.includes(value) ? current : [...current, value];
  }
  return current.filter((entry) => entry !== value);
}

function summarizeSelection(values: string[], placeholder: string) {
  if (!values.length) return placeholder;
  if (values.length <= 2) return values.join(", ");
  return `${values.length} selected`;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="theme-data-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

export default function AdminPage() {
  const {
    token,
    user,
    can,
    refreshMe,
    setSelectedOrganizationId,
    selectedOrganizationId,
    selectedOrganizationName,
    hasOrganizationDataScope,
    requiresOrganizationSelection,
  } = useAuth();
  const { activeAppVariant } = useAppVariantSystem();
  const { activeTheme } = useThemeSystem();
  const location = useLocation();
  const navigate = useNavigate();

  const [users, setUsers] = useState([] as UserRow[]);
  const [modules, setModules] = useState([] as ModuleRow[]);
  const [projects, setProjects] = useState([] as ProjectRow[]);
  const [subEntities, setSubEntities] = useState([] as SubEntityRow[]);
  const [auditRows, setAuditRows] = useState([] as AuditRow[]);
  const [ownerHierarchy, setOwnerHierarchy] = useState<OwnerHierarchyResponse | null>(null);
  const [pendingOrganizations, setPendingOrganizations] = useState([] as PendingOrganizationRow[]);
  const [pendingPlatformUsers, setPendingPlatformUsers] = useState([] as PendingPlatformUserRow[]);
  const [invitations, setInvitations] = useState([] as InvitationRow[]);
  const [pendingMemberSignupRequests, setPendingMemberSignupRequests] = useState([] as PendingOrganizationMemberSignupRow[]);
  const [inviteOrganizationId, setInviteOrganizationId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFullName, setInviteFullName] = useState("");
  const [inviteRole, setInviteRole] = useState("org_user");
  const [inviteExpiryOption, setInviteExpiryOption] = useState<InvitationExpiryOption>("7");
  const [inviteExpiresInDays, setInviteExpiresInDays] = useState("7");
  const [reviewNote, setReviewNote] = useState("");
  const [memberReviewNote, setMemberReviewNote] = useState("");
  const [selectedUser, setSelectedUser] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState([] as number[]);
  const [selectedModule, setSelectedModule] = useState("fuel");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedSubEntityIds, setSelectedSubEntityIds] = useState([] as string[]);
  const [moduleAccessRows, setModuleAccessRows] = useState([] as ModuleAccessRow[]);
  const [draftModuleAccessRows, setDraftModuleAccessRows] = useState([] as ModuleAccessRow[]);
  const [dirtyModuleKeys, setDirtyModuleKeys] = useState([] as string[]);
  const [selectedPreviewActions, setSelectedPreviewActions] = useState(["view"] as string[]);
  const [selectedPreviewProjects, setSelectedPreviewProjects] = useState([] as string[]);
  const [previewResults, setPreviewResults] = useState([] as PreviewResultRow[]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAuditDetails, setShowAuditDetails] = useState(false);
  const [confirmDeleteAuditOpen, setConfirmDeleteAuditOpen] = useState(false);
  const [confirmDeleteOrganizationOpen, setConfirmDeleteOrganizationOpen] = useState(false);
  const [selectedOrganizationDeleteTarget, setSelectedOrganizationDeleteTarget] = useState<OrganizationRemovalCandidate | null>(null);
  const [organizationDirectoryOpen, setOrganizationDirectoryOpen] = useState(false);
  const [accessWorkspaceOpen, setAccessWorkspaceOpen] = useState(false);
  const [selectedOrganizationKey, setSelectedOrganizationKey] = useState("" as string);
  const [roleTemplate, setRoleTemplate] = useState("org_user");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const pageLayout = getWorkspacePageLayoutForVariant(activeTheme, activeAppVariant);

  const selectedUserRow = useMemo(() => users.find((row) => row.id === selectedUser), [users, selectedUser]);
  const selectedSubEntityRows = useMemo(
    () => subEntities.filter((row) => selectedSubEntityIds.includes(row.external_sub_entity_id)),
    [selectedSubEntityIds, subEntities],
  );
  const userGroups = useMemo(() => {
    const rolePriority: Record<string, number> = {
      owner: 0,
      super_admin: 1,
      org_admin: 2,
      org_user: 3,
    };

    const sortedUsers = [...users].sort((left, right) => {
      const leftGroupRank = left.role_scope === "organization" ? 1 : 0;
      const rightGroupRank = right.role_scope === "organization" ? 1 : 0;
      if (leftGroupRank !== rightGroupRank) {
        return leftGroupRank - rightGroupRank;
      }
      const leftGroup = left.role_scope === "organization" ? `org:${left.organization_id ?? 0}` : "platform";
      const rightGroup = right.role_scope === "organization" ? `org:${right.organization_id ?? 0}` : "platform";
      if (leftGroup !== rightGroup) {
        return leftGroup.localeCompare(rightGroup);
      }
      const leftRole = getDisplayRole(left);
      const rightRole = getDisplayRole(right);
      const leftRank = rolePriority[leftRole] ?? 9;
      const rightRank = rolePriority[rightRole] ?? 9;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }
      return left.full_name.localeCompare(right.full_name);
    });

    const groups = [] as Array<{
      key: string;
      title: string;
      subtitle: string;
      rows: UserRow[];
    }>;

    for (const row of sortedUsers) {
      const isOrganizationUser = row.role_scope === "organization";
      const key = isOrganizationUser ? `org:${row.organization_id ?? 0}` : "platform";
      const existingGroup = groups.find((group) => group.key === key);
      if (existingGroup) {
        existingGroup.rows.push(row);
        continue;
      }

      const title = isOrganizationUser ? getOrganizationLabel(row) : "Platform Administration";
      const subtitle = isOrganizationUser
        ? `${row.organization_slug || "workspace"} workspace users`
        : "Owner and super-admin accounts with cross-organization access";
      groups.push({ key, title, subtitle, rows: [row] });
    }

    return groups.map((group) => {
      const adminCount = group.rows.filter((row) => getDisplayRole(row) === "org_admin").length;
      const memberCount = group.rows.filter((row) => getDisplayRole(row) === "org_user").length;
      const subtitle = group.key === "platform"
        ? group.subtitle
        : `${adminCount} org admin${adminCount === 1 ? "" : "s"} · ${memberCount} org user${memberCount === 1 ? "" : "s"}`;
      return {
        ...group,
        subtitle,
      };
    });
  }, [users]);
  const selectedOrganizationGroup = useMemo(
    () => userGroups.find((group) => group.key === selectedOrganizationKey) ?? null,
    [selectedOrganizationKey, userGroups],
  );
  const selectedOrganizationRemovalCandidate = useMemo<OrganizationRemovalCandidate | null>(() => {
    if (!selectedUserRow || selectedUserRow.role_scope !== "organization" || !selectedUserRow.organization_id) {
      return null;
    }
    if (getDisplayRole(selectedUserRow) !== "org_admin") {
      return null;
    }
    const organizationGroup = userGroups.find((group) => group.key === `org:${selectedUserRow.organization_id}`);
    return {
      organizationId: selectedUserRow.organization_id,
      organizationName: getOrganizationLabel(selectedUserRow),
      organizationSlug: selectedUserRow.organization_slug?.trim().toLowerCase() || "",
      adminName: selectedUserRow.full_name,
      adminEmail: selectedUserRow.email,
      memberCount: organizationGroup?.rows.length ?? 0,
      workspaceUrl: selectedUserRow.organization_slug ? buildTenantWorkspaceUrl(selectedUserRow.organization_slug) : null,
    };
  }, [selectedUserRow, userGroups]);
  const isElevatedUser = user?.role === "owner" || user?.role === "super_admin";
  const hasDirtyModuleChanges = dirtyModuleKeys.length > 0;

  const canEditAdmin = can("admin", "edit");
  const canApproveAdmin = can("admin", "approve");
  const canAssignAdmin = can("admin", "assign");
  const canDeleteAdmin = can("admin", "delete");
  const canViewAdmin = can("admin", "view");
  const canReviewOrgMembers = canAssignAdmin && (isElevatedUser || user?.role === "org_admin" || user?.role === "buyer_admin");
  const scopeBadgeLabel = isElevatedUser
    ? (selectedOrganizationName ? `Scoped to ${selectedOrganizationName}` : "Platform governance scope")
    : `Workspace ${selectedOrganizationName || user?.organization_name || "Organization workspace"}`;
  const availableOrganizations = useMemo(
    () =>
      (ownerHierarchy?.organizations ?? []).filter((organization) => {
        const normalizedName = organization.name.trim().toLowerCase();
        const normalizedSlug = organization.slug.trim().toLowerCase();
        return normalizedName !== "example" && normalizedName !== "gmail" && normalizedSlug !== "example" && normalizedSlug !== "gmail";
      }),
    [ownerHierarchy],
  );
  const visibleAdminSections = useMemo(
    () => ADMIN_SECTION_ITEMS.filter((item) => {
      if (item.ownerOnly && !isElevatedUser) return false;
      if (item.requiresAssign && !canAssignAdmin) return false;
      return true;
    }),
    [canAssignAdmin, isElevatedUser],
  );
  const currentAdminSectionKey = useMemo(() => {
    const fromPath = getAdminSectionFromPath(location.pathname);
    if (fromPath && visibleAdminSections.some((item) => item.key === fromPath)) {
      return fromPath;
    }
    return visibleAdminSections[0]?.key ?? "access-governance";
  }, [location.pathname, visibleAdminSections]);
  const currentAdminSection = useMemo(
    () => visibleAdminSections.find((item) => item.key === currentAdminSectionKey) ?? visibleAdminSections[0] ?? null,
    [currentAdminSectionKey, visibleAdminSections],
  );

  function openOrganizationDirectory(groupKey: string) {
    setSelectedOrganizationKey(groupKey);
    setOrganizationDirectoryOpen(true);
  }

  function navigateToAdminSection(sectionKey: string) {
    const target = visibleAdminSections.find((item) => item.key === sectionKey);
    navigate(target?.path ?? DEFAULT_ADMIN_SECTION_PATH);
  }

  function openAccessWorkspace(userId: number) {
    setSelectedUser(userId);
    setOrganizationDirectoryOpen(false);
    setAccessWorkspaceOpen(true);
  }

  async function applyRoleTemplateForUser(userId: number, nextRole?: string) {
    if (!token) return;
    await run(async () => {
      await api.post(`/api/admin/users/${userId}/apply-role-template`, { role: nextRole ?? roleTemplate }, token);
      await loadCore();
      await loadModuleAccess(userId);
    }, "Role template applied.", "Applying role template");
  }

  async function run(action: () => Promise<void>, successText = "", pendingText = "Processing update") {
    try {
      setPendingAction(pendingText);
      setError("");
      if (successText) setMessage("");
      await action();
      if (successText) setMessage(successText);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admin action failed");
    } finally {
      setPendingAction("");
    }
  }

  const loadCore = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setPendingAction("Refreshing governance data");
    setError("");
    const [userRows, moduleRows, audits, hierarchy, orgQueue, platformQueue, invitationRows, memberSignupRows] = await Promise.allSettled([
        api.get<UserRow[]>(`/api/admin/users?include_inactive=true&include_rejected=true&q=${encodeURIComponent(query)}`, token),
        api.get<ModuleRow[]>("/api/admin/modules", token),
        api.get<AuditRow[]>("/api/admin/audit?limit=100", token),
        isElevatedUser ? api.get<OwnerHierarchyResponse>("/api/admin/owner/hierarchy", token) : Promise.resolve(null),
        isElevatedUser ? api.get<PendingOrganizationRow[]>("/api/admin/owner/pending-organizations", token) : Promise.resolve([] as PendingOrganizationRow[]),
        isElevatedUser ? api.get<PendingPlatformUserRow[]>("/api/admin/owner/pending-platform-users", token) : Promise.resolve([] as PendingPlatformUserRow[]),
        api.get<InvitationRow[]>("/api/admin/organizations/invitations", token),
      canReviewOrgMembers ? api.get<PendingOrganizationMemberSignupRow[]>("/api/admin/organizations/member-signup-requests", token) : Promise.resolve([] as PendingOrganizationMemberSignupRow[]),
      ]);

    if (userRows.status === "fulfilled") {
      setUsers(userRows.value ?? []);
      if (!selectedUser && (userRows.value?.length ?? 0) > 0) {
        setSelectedUser(userRows.value[0].id);
      }
    }
    if (moduleRows.status === "fulfilled") {
      setModules(moduleRows.value ?? []);
      if (!selectedModule && (moduleRows.value?.length ?? 0) > 0) {
        setSelectedModule(moduleRows.value[0].module_key);
      }
    }
    if (audits.status === "fulfilled") {
      setAuditRows(audits.value ?? []);
    }
    if (hierarchy.status === "fulfilled") {
      setOwnerHierarchy(hierarchy.value);
      if (selectedOrganizationId) {
        setInviteOrganizationId(String(selectedOrganizationId));
      } else if (isElevatedUser && !inviteOrganizationId && (hierarchy.value?.organizations?.length ?? 0) > 0) {
        setInviteOrganizationId(String(hierarchy.value?.organizations[0]?.id ?? ""));
      }
    }
    if (orgQueue.status === "fulfilled") {
      setPendingOrganizations(orgQueue.value ?? []);
    }
    if (platformQueue.status === "fulfilled") {
      setPendingPlatformUsers(platformQueue.value ?? []);
    }
    if (invitationRows.status === "fulfilled") {
      setInvitations(invitationRows.value ?? []);
    }
    if (memberSignupRows.status === "fulfilled") {
      setPendingMemberSignupRequests(memberSignupRows.value ?? []);
    }

    const criticalFailures = [userRows, moduleRows, audits].filter((result) => result.status === "rejected");
    if (criticalFailures.length > 0) {
      const firstFailure = criticalFailures[0];
      if (firstFailure.status === "rejected") {
        setError(firstFailure.reason instanceof Error ? firstFailure.reason.message : "Some governance data could not be loaded");
      }
    }

    setPendingAction("");
    setLoading(false);
  }, [canReviewOrgMembers, inviteOrganizationId, isElevatedUser, query, selectedModule, selectedOrganizationId, selectedUser, token]);

  useEffect(() => {
    if (!isElevatedUser) {
      return;
    }
    if (selectedOrganizationId) {
      setInviteOrganizationId(String(selectedOrganizationId));
      return;
    }
    if (requiresOrganizationSelection && !hasOrganizationDataScope) {
      setInviteOrganizationId("");
    }
  }, [hasOrganizationDataScope, isElevatedUser, requiresOrganizationSelection, selectedOrganizationId]);

  const loadAuditHistory = useCallback(async () => {
    if (!token) return;
    await run(async () => {
      const rows = await api.get<AuditRow[]>("/api/admin/audit?limit=500", token);
      setAuditRows(rows ?? []);
    }, "", "Refreshing audit history");
  }, [selectedOrganizationId, token]);

  const loadModuleAccess = useCallback(async (userId: number) => {
    if (!token || !userId) return;
    await run(async () => {
      const rows = await api.get<ModuleAccessRow[]>(`/api/admin/access/module/${userId}`, token);
      setModuleAccessRows(rows ?? []);
      setDraftModuleAccessRows(rows ?? []);
      setDirtyModuleKeys([]);
    }, "", "Loading module access");
  }, [selectedOrganizationId, token]);

  const loadProjects = useCallback(async (moduleKey: string) => {
    if (!token || !moduleKey) return;
    await run(async () => {
      const rows = await api.get<ProjectRow[]>(`/api/admin/projects/${moduleKey}`, token);
      setProjects(rows ?? []);
      if ((rows?.length ?? 0) > 0) {
        setSelectedProject((current) => current || rows[0].external_project_id);
        setSelectedPreviewProjects((current) => current.filter((projectId) => rows.some((row) => row.external_project_id === projectId)));
      } else {
        setSelectedProject("");
        setSelectedPreviewProjects([]);
      }
    }, "", "Loading project scope");
  }, [selectedOrganizationId, token]);

  const loadSubEntities = useCallback(async (moduleKey: string, projectId: string) => {
    if (!token || !projectId) {
      setSubEntities([]);
      setSelectedSubEntityIds([]);
      return;
    }
    await run(async () => {
      const rows = await api.get<SubEntityRow[]>(`/api/admin/sub-entities/${moduleKey}/${projectId}`, token);
      setSubEntities(rows ?? []);
      if ((rows?.length ?? 0) > 0) {
        setSelectedSubEntityIds((current) => current.filter((id) => rows.some((row) => row.external_sub_entity_id === id)));
      } else {
        setSelectedSubEntityIds([]);
      }
    }, "", "Loading sub-entities");
  }, [selectedOrganizationId, token]);

  useEffect(() => {
    setSelectedUser(0);
    setSelectedUsers([]);
    setSelectedProject("");
    setSubEntities([]);
    setSelectedSubEntityIds([]);
    setModuleAccessRows([]);
    setDraftModuleAccessRows([]);
    setDirtyModuleKeys([]);
    setPreviewResults([]);
    setSelectedPreviewProjects([]);
  }, [selectedOrganizationId]);

  useEffect(() => {
    void loadCore();
  }, [loadCore]);

  useEffect(() => {
    if (selectedUser) {
      void loadModuleAccess(selectedUser);
    }
  }, [selectedUser, loadModuleAccess]);

  useEffect(() => {
    if (!selectedUserRow) return;
    const displayRole = getDisplayRole(selectedUserRow);
    setRoleTemplate(displayRole === "org_admin" ? "buyer_admin" : selectedUserRow.role);
  }, [selectedUserRow]);

  useEffect(() => {
    const fromPath = getAdminSectionFromPath(location.pathname);
    const firstVisible = visibleAdminSections[0];
    if (!firstVisible) return;
    if (!fromPath || !visibleAdminSections.some((item) => item.key === fromPath)) {
      navigate(firstVisible.path, { replace: true });
    }
  }, [location.pathname, navigate, visibleAdminSections]);

  useEffect(() => {
    if (selectedModule) {
      void loadProjects(selectedModule);
    }
  }, [selectedModule, loadProjects]);

  useEffect(() => {
    if (selectedModule && selectedProject) {
      void loadSubEntities(selectedModule, selectedProject);
    }
  }, [selectedModule, selectedProject, loadSubEntities]);

  function toggleModulePermission(moduleKey: string, permissionKey: keyof PermissionFlags, checked: boolean) {
    setDraftModuleAccessRows((current) => {
      const nextRows = current.map((row) => row.module_key === moduleKey ? { ...row, [permissionKey]: checked } : row);
      const nextRow = nextRows.find((row) => row.module_key === moduleKey);
      const sourceRow = moduleAccessRows.find((row) => row.module_key === moduleKey);
      if (nextRow && sourceRow) {
        const isDirty = PERMISSION_KEYS.some((key) => nextRow[key] !== sourceRow[key]);
        setDirtyModuleKeys((existing) => isDirty ? Array.from(new Set([...existing, moduleKey])) : existing.filter((key) => key !== moduleKey));
      }
      return nextRows;
    });
  }

  function resetModulePermissionDrafts() {
    setDraftModuleAccessRows(moduleAccessRows);
    setDirtyModuleKeys([]);
  }

  async function previewPermission() {
    if (!token || !selectedUser) return;
    if (!selectedPreviewActions.length) {
      setError("Select at least one action to preview.");
      return;
    }
    const previewProjectIds = selectedPreviewProjects.length ? selectedPreviewProjects : (selectedProject ? [selectedProject] : [""]);
    const previewSubEntities = previewProjectIds.length === 1 && selectedSubEntityRows.length
      ? selectedSubEntityRows.map((row) => ({
        sub_entity_key: row.sub_entity_key,
        sub_entity_id: row.external_sub_entity_id,
        sub_entity_label: row.sub_entity_name,
      }))
      : [{
        sub_entity_key: "",
        sub_entity_id: "",
        sub_entity_label: "No sub-entity",
      }];
    await run(async () => {
      const results = await Promise.all(
        previewProjectIds.flatMap((projectId) => selectedPreviewActions.flatMap((action) => previewSubEntities.map(async (subEntity) => {
          const result = await api.post<{ granted: boolean; source: string }>(
            "/api/admin/access/preview",
            {
              user_id: selectedUser,
              module_key: selectedModule,
              action,
              project_id: projectId,
              sub_entity_key: subEntity.sub_entity_key,
              sub_entity_id: subEntity.sub_entity_id,
            },
            token,
          );
          const projectRow = projects.find((row) => row.external_project_id === projectId);
          return {
            ...result,
            action,
            project_id: projectId,
            project_label: projectId ? (projectRow?.project_name || projectId) : "Module-wide preview",
            sub_entity_id: subEntity.sub_entity_id,
            sub_entity_label: subEntity.sub_entity_label,
            result_key: [projectId || "module", action, subEntity.sub_entity_id || "none"].join("::"),
          };
        }))),
      );
      setPreviewResults(results);
    }, "", "Previewing permissions");
  }

  async function saveModulePermissions() {
    if (!token || !selectedUser || !dirtyModuleKeys.length) return;
    await run(async () => {
      for (const moduleKey of dirtyModuleKeys) {
        const row = draftModuleAccessRows.find((item) => item.module_key === moduleKey);
        if (!row) continue;
        await api.post(
          "/api/admin/access/module",
          {
            user_id: selectedUser,
            module_key: moduleKey,
            permissions: {
              can_view: row.can_view,
              can_create: row.can_create,
              can_edit: row.can_edit,
              can_delete: row.can_delete,
              can_approve: row.can_approve,
              can_assign: row.can_assign,
              can_evaluate: row.can_evaluate,
            },
          },
          token,
        );
      }
      await loadModuleAccess(selectedUser);
      await previewPermission();
    }, "Module permissions saved.", "Saving module permissions");
  }

  async function deleteUserAccount(userId: number) {
    if (!token) return;
    await run(async () => {
      await api.del(`/api/admin/users/${userId}`, token);
      setSelectedUsers((current) => current.filter((id) => id !== userId));
      if (selectedUser === userId) {
        setSelectedUser(0);
      }
      await loadCore();
    }, "User account deleted.", "Deleting user account");
  }

  async function deleteSelectedOrganization() {
    if (!token || !selectedOrganizationDeleteTarget) return;
    await run(async () => {
      await api.del(`/api/admin/organizations/${selectedOrganizationDeleteTarget.organizationId}`, token);
      setConfirmDeleteOrganizationOpen(false);
      setSelectedOrganizationDeleteTarget(null);
      setOrganizationDirectoryOpen(false);
      setAccessWorkspaceOpen(false);
      setSelectedOrganizationKey("");
      setSelectedUser(0);
      setSelectedUsers([]);
      if (selectedOrganizationId === selectedOrganizationDeleteTarget.organizationId) {
        setSelectedOrganizationId(null);
      }
      if (inviteOrganizationId === String(selectedOrganizationDeleteTarget.organizationId)) {
        setInviteOrganizationId("");
      }
      await loadCore();
      await refreshMe();
    }, "Organization workspace removed.", "Removing organization workspace");
  }

  async function deleteAuditLogs() {
    if (!token) return;
    await run(async () => {
      await api.del("/api/admin/audit", token);
      setAuditRows([]);
      setShowAuditDetails(false);
      setConfirmDeleteAuditOpen(false);
    }, "Audit history cleared.", "Clearing audit history");
  }

  async function reviewOrganizationSignup(organizationId: number, approve: boolean) {
    if (!token) return;
    await run(async () => {
      await api.post(
        "/api/admin/owner/review-organization",
        {
          organization_id: organizationId,
          approve,
          note: reviewNote.trim(),
        },
        token,
      );
      setReviewNote("");
      await loadCore();
    }, approve ? "Organization approved." : "Organization rejected.", approve ? "Approving organization" : "Rejecting organization");
  }

  async function reviewPlatformUser(userId: number, approve: boolean) {
    if (!token) return;
    await run(async () => {
      await api.post(
        "/api/admin/owner/review-platform-user",
        {
          user_id: userId,
          approve,
          note: reviewNote.trim(),
        },
        token,
      );
      setReviewNote("");
      await loadCore();
    }, approve ? "Platform user approved." : "Platform user rejected.", approve ? "Approving platform user" : "Rejecting platform user");
  }

  async function createInvitation() {
    if (!token) return;
    const organizationId = isElevatedUser ? Number(inviteOrganizationId) : user?.organization_id;
    if (!organizationId) {
      setError("Select an organization before sending an invitation.");
      return;
    }
    const normalizedEmail = inviteEmail.trim();
    if (!normalizedEmail) {
      setError("Enter an invitee email before sending an invitation.");
      return;
    }
    const resolvedExpiryDays = inviteExpiryOption === "never"
      ? 0
      : inviteExpiryOption === "custom"
        ? Number(inviteExpiresInDays || 7)
        : Number(inviteExpiryOption);
    if (!Number.isFinite(resolvedExpiryDays) || resolvedExpiryDays < 0 || resolvedExpiryDays > 30) {
      setError("Expiry must be between 1 and 30 days.");
      return;
    }
    let debugInvitationLink = "";
    await run(async () => {
      const response = await api.post<{ invitation_link?: string }>(
        "/api/admin/organizations/invitations",
        {
          organization_id: organizationId,
          email: normalizedEmail,
          full_name: inviteFullName.trim(),
          role: inviteRole,
          expires_in_days: resolvedExpiryDays,
        },
        token,
      );
      setInviteEmail("");
      setInviteFullName("");
      setInviteRole("org_user");
      setInviteExpiryOption("7");
      setInviteExpiresInDays("7");
      await loadCore();
      debugInvitationLink = response.invitation_link ?? "";
    }, "Invitation created.", "Creating invitation");
    if (debugInvitationLink) {
      setMessage(`Invitation created. Local link: ${debugInvitationLink}`);
    }
  }

  async function resendInvitation(invitationId: number) {
    if (!token) return;
    let debugInvitationLink = "";
    await run(async () => {
      const response = await api.post<{ invitation_link?: string }>(
        `/api/admin/organizations/invitations/${invitationId}/resend`,
        {},
        token,
      );
      debugInvitationLink = response.invitation_link ?? "";
      await loadCore();
    }, "Invitation resent.", "Resending invitation");
    if (debugInvitationLink) {
      setMessage(`Invitation resent. Local link: ${debugInvitationLink}`);
    }
  }

  async function revokeInvitation(invitationId: number) {
    if (!token) return;
    await run(async () => {
      await api.post(`/api/admin/organizations/invitations/${invitationId}/revoke`, {}, token);
      await loadCore();
    }, "Invitation revoked.", "Revoking invitation");
  }

  async function reviewOrganizationMemberSignup(requestId: number, approve: boolean) {
    if (!token) return;
    await run(async () => {
      await api.post(
        `/api/admin/organizations/member-signup-requests/${requestId}/review`,
        {
          approve,
          note: memberReviewNote.trim(),
        },
        token,
      );
      setMemberReviewNote("");
      await loadCore();
    }, approve ? "Member access approved." : "Member access rejected.", approve ? "Approving member access" : "Rejecting member access");
  }

  if (loading) {
    return <PageLoadingState title="Loading governance data" description="Pulling users, module access, projects, and recent audit history for the admin workspace." />;
  }

  return (
    <div className="space-y-6">
      <div className="theme-floating-panel theme-hero-panel p-4 md:p-5">
        <div className={cn("flex flex-col gap-5 xl:flex-row xl:justify-between", pageLayout.heroBodyAlign)}>
          <div className={pageLayout.heroTitleAlign}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{scopeBadgeLabel}</Badge>
          </div>
          <h1 className="theme-hero-text text-3xl font-bold">Admin Control Center</h1>
          <p className="theme-hero-copy mt-1 text-sm">Structured governance workspace for approvals, organization operations, user access, invitations, and audit oversight.</p>
          </div>
          <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void loadCore()}><RefreshCcw className="mr-2 h-4 w-4" />Refresh</Button>
          {canAssignAdmin && <Button onClick={() => void previewPermission()}><Eye className="mr-2 h-4 w-4" />Permission Preview</Button>}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="outline">{users.length} users</Badge>
          <Badge variant="outline">{selectedUsers.length} selected</Badge>
          <Badge variant="outline">Module {selectedModule}</Badge>
          <Badge variant="outline">{visibleAdminSections.length} admin pages</Badge>
          {selectedProject ? <Badge variant="outline">Project scoped</Badge> : null}
          {query ? <Badge variant="outline">Filter {query}</Badge> : null}
          <InlineStatus state={pendingAction ? "loading" : message ? "success" : "idle"} label={pendingAction || message} className="ml-auto" />
        </div>
        <div className={cn("mt-4", pageLayout.summaryGrid)}>
          <MetricCard label="Users" value={String(users.length)} />
          <MetricCard label="Admin sections" value={String(visibleAdminSections.length)} />
          <MetricCard label="Pending orgs" value={String(ownerHierarchy?.summary.pending_organizations ?? 0)} />
          <MetricCard label="Audit rows" value={String(auditRows.length)} />
        </div>
      </div>

      {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
      {message && <Alert><AlertDescription>{message}</AlertDescription></Alert>}

      <div className="theme-muted-panel p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Admin Pages</div>
            <div className="mt-1 text-sm text-muted-foreground">Open a focused admin page instead of working through the entire governance stack in one scroll.</div>
          </div>
          {currentAdminSection ? <Badge variant="outline">{currentAdminSection.title}</Badge> : null}
        </div>
        <div className={cn("mt-4 grid gap-2 md:grid-cols-2", activeTheme.layout.dashboard === "command" || activeTheme.layout.dashboard === "spotlight" ? "2xl:grid-cols-6" : "xl:grid-cols-5")}>
          {visibleAdminSections.map((section) => (
            <NavLink
              key={section.key}
              to={section.path}
              className={cn(
                "rounded-2xl border px-4 py-3 transition-all",
                currentAdminSectionKey === section.key
                  ? "border-primary/30 bg-primary/10 text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.14)]"
                  : "border-border/70 bg-muted/10 text-muted-foreground hover:border-primary/20 hover:bg-primary/5 hover:text-foreground",
              )}
            >
              <div className="text-sm font-semibold">{section.title}</div>
              <div className="mt-1 text-xs leading-5 opacity-80">{section.description}</div>
            </NavLink>
          ))}
        </div>
      </div>

      <Accordion type="single" value={currentAdminSectionKey} onValueChange={navigateToAdminSection} collapsible={false} className="space-y-4">
        <AccordionItem value="access-governance" className={cn("theme-elevated-section px-6", currentAdminSectionKey !== "access-governance" && "hidden")}>
          <AccordionTrigger className="hidden">
            <div>
              <div>Access Governance Center</div>
              <div className="mt-1 text-sm font-normal text-muted-foreground">Platform-wide governance summary, live counters, and admin workspace status.</div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Users" value={String(users.length)} />
              <MetricCard label="Selected Users" value={String(selectedUsers.length)} />
              <MetricCard label={isElevatedUser ? "Pending Orgs" : "Modules"} value={String(isElevatedUser ? (ownerHierarchy?.summary.pending_organizations ?? 0) : modules.length)} />
              <MetricCard label={isElevatedUser ? "Pending Users" : "Audit Rows"} value={String(isElevatedUser ? (ownerHierarchy?.summary.pending_platform_users ?? 0) : auditRows.length)} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {isElevatedUser && (
          <AccordionItem value="owner-governance" className={cn("theme-elevated-section px-6", currentAdminSectionKey !== "owner-governance" && "hidden")}>
            <AccordionTrigger className="hidden">
              <div>
                <div>Owner Approval Queue and Organization Directory</div>
                <div className="mt-1 text-sm font-normal text-muted-foreground">Owner-only review lane for organizations, platform users, and live tenant directory visibility.</div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6">
              <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <Card className="theme-widget-card">
                  <CardHeader>
                    <CardTitle>Owner Approval Queue</CardTitle>
                    <CardDescription>Review pending organization signups and standalone platform user requests.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <MetricCard label="Pending Organizations" value={String(ownerHierarchy?.summary.pending_organizations ?? 0)} />
                      <MetricCard label="Approved Organizations" value={String(ownerHierarchy?.summary.approved_organizations ?? 0)} />
                      <MetricCard label="Pending Platform Users" value={String(ownerHierarchy?.summary.pending_platform_users ?? 0)} />
                      <MetricCard label="Approved Platform Users" value={String(ownerHierarchy?.summary.approved_platform_users ?? 0)} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reviewNote">Review note</Label>
                      <Textarea id="reviewNote" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Optional approval or rejection note" className="min-h-[96px]" />
                    </div>

                    <div className="grid gap-6 xl:grid-cols-2">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Organization Queue</h3>
                        </div>
                        <div className="space-y-3">
                          {pendingOrganizations.map((row) => (
                            <div key={row.id} className="rounded-2xl border border-border/70 bg-muted/10 p-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <div className="text-lg font-semibold">{row.name}</div>
                                  <div className="mt-1 text-sm text-muted-foreground">{row.admin_full_name || "Organization admin"} · {row.admin_email || row.purchaser_email}</div>
                                  {row.purchase_reference ? <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">Purchase Ref: {row.purchase_reference}</div> : null}
                                </div>
                                <Badge variant="outline">{row.approval_status}</Badge>
                              </div>
                              <div className="mt-4 flex flex-wrap gap-2">
                                <Button size="sm" onClick={() => void reviewOrganizationSignup(row.id, true)}>Approve</Button>
                                <Button size="sm" variant="outline" onClick={() => void reviewOrganizationSignup(row.id, false)}>Reject</Button>
                              </div>
                            </div>
                          ))}
                          {!pendingOrganizations.length && (
                            <EmptyState
                              icon={Building2}
                              title="No organizations waiting"
                              description="New organization signups will appear here after OTP verification completes."
                              className="min-h-[180px]"
                            />
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Platform User Queue</h3>
                        </div>
                        <div className="space-y-3">
                          {pendingPlatformUsers.map((row) => (
                            <div key={row.id} className="rounded-2xl border border-border/70 bg-muted/10 p-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <div className="text-lg font-semibold">{row.full_name}</div>
                                  <div className="mt-1 text-sm text-muted-foreground">{row.email}</div>
                                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{row.signup_type}</div>
                                </div>
                                <Badge variant="outline">pending</Badge>
                              </div>
                              <div className="mt-4 flex flex-wrap gap-2">
                                <Button size="sm" onClick={() => void reviewPlatformUser(row.id, true)}>Approve</Button>
                                <Button size="sm" variant="outline" onClick={() => void reviewPlatformUser(row.id, false)}>Reject</Button>
                              </div>
                            </div>
                          ))}
                          {!pendingPlatformUsers.length && (
                            <EmptyState
                              icon={Users}
                              title="No platform users waiting"
                              description="Standalone normal-user requests will appear here after OTP verification completes."
                              className="min-h-[180px]"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="theme-widget-card">
                  <CardHeader>
                    <CardTitle>Organization Directory</CardTitle>
                    <CardDescription>Live tenant view for owner-level governance and invitation targeting.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {availableOrganizations.map((organization) => (
                      <div key={organization.id} className="rounded-2xl border border-border/70 bg-muted/10 p-4">
                          <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold">{organization.name}</div>
                            <div className="mt-1 text-sm text-muted-foreground">{organization.slug}</div>
                          </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{organization.approval_status}</Badge>
                              {isElevatedUser && canDeleteAdmin ? (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedOrganizationDeleteTarget({
                                      organizationId: organization.id,
                                      organizationName: organization.name,
                                      organizationSlug: organization.slug,
                                      adminName: organization.admin_count ? `${organization.admin_count} organization admin${organization.admin_count === 1 ? "" : "s"}` : "No admin assigned",
                                      adminEmail: organization.slug,
                                      memberCount: organization.admin_count + organization.user_count,
                                      workspaceUrl: organization.slug ? buildTenantWorkspaceUrl(organization.slug) : null,
                                    });
                                    setConfirmDeleteOrganizationOpen(true);
                                  }}
                                >
                                  Remove Organization
                                </Button>
                              ) : null}
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          <span>{organization.admin_count} admins</span>
                          <span>{organization.user_count} users</span>
                          <span>{organization.status}</span>
                        </div>
                      </div>
                    ))}
                    {!availableOrganizations.length && (
                      <EmptyState
                        icon={Building2}
                        title="No organizations loaded"
                        description="Approved and pending organizations will appear here once they exist in the tenant registry."
                        className="min-h-[220px]"
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {canAssignAdmin && (
          <AccordionItem value="member-requests" className={cn("theme-elevated-section px-6", currentAdminSectionKey !== "member-requests" && "hidden")}>
            <AccordionTrigger className="hidden">
              <div>
                <div>Organization Member Requests</div>
                <div className="mt-1 text-sm font-normal text-muted-foreground">Review self-signup member access requests before they become active organization users.</div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6">
              <Card className="theme-widget-card">
                <CardHeader>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle>Organization Member Requests</CardTitle>
                      <CardDescription>Review tenant self-signup requests after email verification and convert them into active organization users.</CardDescription>
                    </div>
                    <Badge variant="outline">{pendingMemberSignupRequests.length} pending</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="memberReviewNote">Review note</Label>
                    <Textarea id="memberReviewNote" value={memberReviewNote} onChange={(event) => setMemberReviewNote(event.target.value)} placeholder="Optional note for approval or rejection" className="min-h-[88px]" />
                  </div>

                  <div className="space-y-3">
                    {pendingMemberSignupRequests.map((row) => (
                      <div key={row.id} className="rounded-2xl border border-border/70 bg-muted/10 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-lg font-semibold">{row.full_name}</div>
                            <div className="mt-1 text-sm text-muted-foreground">{row.email}</div>
                            <div className="mt-1 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              <span>{row.organization_name}</span>
                              <span>{row.requested_role}</span>
                              <span>{row.created_at}</span>
                            </div>
                          </div>
                          <Badge variant="outline">{row.status}</Badge>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => void reviewOrganizationMemberSignup(row.id, true)} disabled={!canReviewOrgMembers}>Approve</Button>
                          <Button size="sm" variant="outline" onClick={() => void reviewOrganizationMemberSignup(row.id, false)} disabled={!canReviewOrgMembers}>Reject</Button>
                        </div>
                      </div>
                    ))}
                    {!pendingMemberSignupRequests.length && (
                      <EmptyState
                        icon={Users}
                        title="No member requests waiting"
                        description="Tenant-host self-signup requests will appear here once members verify their email and submit access for review."
                        className="min-h-[200px]"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
        )}

        <AccordionItem value="user-management" className={cn("theme-elevated-section px-6", currentAdminSectionKey !== "user-management" && "hidden")}>
          <AccordionTrigger className="hidden">
            <div>
              <div>User Management and Invitation Studio</div>
              <div className="mt-1 text-sm font-normal text-muted-foreground">Manage organization invitations, user roles, organization grouping, and person-level access entry points.</div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-6 pb-6">
            {canAssignAdmin && (
              <Card className="theme-widget-card">
                <CardHeader>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle>Invitation Studio</CardTitle>
                      <CardDescription>Create organization invitations and track their acceptance lifecycle.</CardDescription>
                    </div>
                    <Badge variant="outline">{invitations.length} invitations</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                    <div className="space-y-4 rounded-[1.5rem] border border-border/70 bg-muted/10 p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        {isElevatedUser ? (
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="inviteOrganization">Organization</Label>
                            <select id="inviteOrganization" className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={inviteOrganizationId} onChange={(event) => setInviteOrganizationId(event.target.value)}>
                              <option value="">Select organization</option>
                              {availableOrganizations.filter((row) => row.approval_status === "approved").map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                            </select>
                          </div>
                        ) : null}
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="inviteEmail">Invitee email</Label>
                          <Input id="inviteEmail" type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="member@company.com" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="inviteFullName">Invitee name</Label>
                          <Input id="inviteFullName" value={inviteFullName} onChange={(event) => setInviteFullName(event.target.value)} placeholder="Optional full name" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="inviteRole">Role</Label>
                          <select id="inviteRole" className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}>
                            <option value="org_user">Organization User</option>
                            <option value="buyer_admin">Organization Admin</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="inviteExpiryOption">Expiry</Label>
                          <select
                            id="inviteExpiryOption"
                            className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
                            value={inviteExpiryOption}
                            onChange={(event) => {
                              const nextValue = event.target.value as InvitationExpiryOption;
                              setInviteExpiryOption(nextValue);
                              if (nextValue !== "custom") {
                                setInviteExpiresInDays(nextValue);
                              }
                            }}
                          >
                            <option value="1">1 day</option>
                            <option value="3">3 days</option>
                            <option value="7">7 days</option>
                            <option value="14">14 days</option>
                            <option value="30">30 days</option>
                            <option value="never">Never</option>
                            <option value="custom">Custom</option>
                          </select>
                        </div>
                        {inviteExpiryOption === "custom" ? (
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="inviteExpiry">Expiry days</Label>
                            <Input id="inviteExpiry" type="number" min={1} max={30} value={inviteExpiresInDays} onChange={(event) => setInviteExpiresInDays(event.target.value)} />
                          </div>
                        ) : null}
                      </div>
                      <Button onClick={() => void createInvitation()} className="w-full gap-2">
                        <Send className="h-4 w-4" />
                        Send invitation
                      </Button>
                    </div>

                    <div className="overflow-x-auto rounded-[1.5rem] border border-border/70 bg-muted/10 p-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invitee</TableHead>
                            <TableHead>Organization</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Expiry</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invitations.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell>
                                <div className="font-medium">{row.full_name || "Pending name"}</div>
                                <div className="text-sm text-muted-foreground">{row.email}</div>
                              </TableCell>
                              <TableCell>{row.organization_name}</TableCell>
                              <TableCell><Badge variant="outline">{getRoleLabel(row.role === "buyer_admin" ? "org_admin" : row.role)}</Badge></TableCell>
                              <TableCell><Badge variant="outline">{row.status}</Badge></TableCell>
                              <TableCell>{formatInvitationExpiry(row.expires_at)}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-2">
                                  <Button size="sm" variant="outline" onClick={() => void resendInvitation(row.id)} disabled={row.status !== "pending"}>Resend</Button>
                                  <Button size="sm" variant="outline" onClick={() => void revokeInvitation(row.id)} disabled={row.status !== "pending"}>Revoke</Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {!invitations.length && (
                            <TableRow>
                              <TableCell colSpan={6}>
                                <EmptyState
                                  icon={MailPlus}
                                  title="No invitations yet"
                                  description="Create the first invitation to onboard an organization user or organization admin."
                                  className="min-h-[190px] border-0 bg-transparent shadow-none"
                                />
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="theme-widget-card">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Search, review, and manage users grouped by platform scope and organization workspace, with organization admins listed before their members.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input placeholder="Search users..." value={query} onChange={(e) => setQuery(e.target.value)} className="w-[220px]" />
              {canApproveAdmin && <Button variant="outline" onClick={() => void bulkApprove(true)} disabled={!selectedUsers.length}><Users className="mr-2 h-4 w-4" />Bulk Approve</Button>}
              {canApproveAdmin && <Button variant="outline" onClick={() => void bulkApprove(false)} disabled={!selectedUsers.length}>Bulk Reject</Button>}
              {canDeleteAdmin && <Button variant="destructive" onClick={() => void removeRejectedUsers()} disabled={!selectedUsers.length}>Remove Rejected</Button>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge variant="outline">{users.length} loaded</Badge>
            {query ? <Badge variant="outline">Search active</Badge> : null}
            {selectedUserRow ? <Badge variant="outline">Focused user {selectedUserRow.full_name}</Badge> : null}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Select</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approval</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userGroups.map((group) => (
                <Fragment key={group.key}>
                  <TableRow className="bg-muted/10 hover:bg-muted/10">
                    <TableCell colSpan={7}>
                      <div className="flex flex-wrap items-center justify-between gap-3 py-1">
                        <div>
                          <button
                            type="button"
                            className="text-left"
                            onClick={() => group.key !== "platform" && openOrganizationDirectory(group.key)}
                            disabled={group.key === "platform"}
                          >
                            <div className={cn("text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground", group.key !== "platform" && "hover:text-primary")}>{group.title}</div>
                          </button>
                          <div className="mt-1 text-sm text-muted-foreground">{group.subtitle}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {group.key !== "platform" ? <Button size="sm" variant="outline" onClick={() => openOrganizationDirectory(group.key)}>Open Members</Button> : null}
                          <Badge variant="outline">{group.rows.length} users</Badge>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                  {group.rows.map((row) => {
                    const displayRole = getDisplayRole(row);
                    const selectValue = displayRole === "org_admin" ? "buyer_admin" : row.role;
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <input type="checkbox" checked={selectedUsers.includes(row.id)} onChange={(event) => setSelectedUsers((current) => event.target.checked ? [...current, row.id] : current.filter((id) => id !== row.id))} />
                        </TableCell>
                        <TableCell>
                          <button type="button" className={cn("text-left font-medium hover:underline", selectedUser === row.id && "text-primary")} onClick={() => setSelectedUser(row.id)}>
                            {row.full_name}
                          </button>
                          <div className="text-sm text-muted-foreground">{row.email}</div>
                        </TableCell>
                        <TableCell>
                          <button type="button" className="text-left" onClick={() => row.role_scope === "organization" ? openOrganizationDirectory(`org:${row.organization_id ?? 0}`) : openAccessWorkspace(row.id)}>
                            <div className="font-medium hover:text-primary">{getOrganizationLabel(row)}</div>
                            <div className="text-sm text-muted-foreground">
                              {row.role_scope === "organization"
                                ? (row.organization_slug ? `${row.organization_slug} workspace` : "Organization workspace")
                                : "Cross-organization governance"}
                            </div>
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            <Badge variant="outline" className={cn("w-fit text-[10px] uppercase tracking-wider", roleColors[displayRole] || "bg-muted text-muted-foreground")}>{getRoleLabel(displayRole)}</Badge>
                            <div className="text-sm text-muted-foreground">{getRoleSupportText(row)}</div>
                            <select className="h-9 rounded-md border bg-background px-2 text-sm" value={selectValue} onChange={(event) => void updateUserRole(row.id, event.target.value)} disabled={!canEditAdmin}>
                              <option value="org_user">Organization User</option>
                              <option value="buyer_admin">Organization Admin</option>
                              {isElevatedUser ? <option value="super_admin">Super Admin</option> : null}
                              {isElevatedUser ? <option value="owner">Owner</option> : null}
                            </select>
                          </div>
                        </TableCell>
                        <TableCell>{row.is_active ? "Active" : "Suspended"}</TableCell>
                        <TableCell>{row.is_approved ? "Approved" : "Pending/Rejected"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {canEditAdmin && <Button variant="outline" size="sm" onClick={() => void updateUserStatus(row.id, !row.is_active)}>{row.is_active ? "Suspend" : "Activate"}</Button>}
                            {canAssignAdmin && <Button variant="outline" size="sm" onClick={() => openAccessWorkspace(row.id)}>Access</Button>}
                            {canDeleteAdmin && <Button variant="destructive" size="sm" onClick={() => void deleteUserAccount(row.id)} disabled={row.id === user?.id} title={row.id === user?.id ? "Use profile page to delete your own account" : "Delete account"}><Trash2 className="h-4 w-4" /></Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </Fragment>
              ))}
              {!users.length && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState
                      icon={Users}
                      title="No users found"
                      description={query ? "No user matched the current search query." : "No users are available in the current governance scope."}
                      className="min-h-[170px] border-0 bg-transparent shadow-none"
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {isElevatedUser && canDeleteAdmin ? (
            <div className="mt-6 border-t border-border/70 pt-6">
              <Card className="border-destructive/30 bg-destructive/5 shadow-none">
                <CardHeader>
                  <CardTitle>Remove Organization</CardTitle>
                  <CardDescription>
                    Select an organization admin from the user table above to permanently remove that workspace, its tenant link, and the organization-owned records tied to it.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedOrganizationRemovalCandidate ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-4">
                        <MetricCard label="Organization" value={selectedOrganizationRemovalCandidate.organizationName} />
                        <MetricCard label="Workspace Admin" value={selectedOrganizationRemovalCandidate.adminName} />
                        <MetricCard label="Members" value={String(selectedOrganizationRemovalCandidate.memberCount)} />
                        <MetricCard label="Workspace Link" value={selectedOrganizationRemovalCandidate.organizationSlug || "No slug"} />
                      </div>
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          This removes the tenant workspace domain, org users, invitations, approvals, permissions, and organization-owned records across the connected module stores.
                          {selectedOrganizationRemovalCandidate.workspaceUrl ? ` ${selectedOrganizationRemovalCandidate.workspaceUrl} will stop resolving after deletion.` : ""}
                        </AlertDescription>
                      </Alert>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm text-muted-foreground">
                          Focused admin: {selectedOrganizationRemovalCandidate.adminEmail}
                        </div>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            setSelectedOrganizationDeleteTarget(selectedOrganizationRemovalCandidate);
                            setConfirmDeleteOrganizationOpen(true);
                          }}
                        >
                          Remove Organization
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <EmptyState
                      icon={Building2}
                      title="Select an organization admin"
                      description="Choose a focused user with the Organization Admin role to enable full organization removal from this panel."
                      className="min-h-[170px] border-0 bg-transparent shadow-none"
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </CardContent>
      </Card>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="audit-trail" className={cn("theme-elevated-section px-6", currentAdminSectionKey !== "audit-trail" && "hidden")}>
          <AccordionTrigger className="hidden">
            <div>
              <div>Audit Trail</div>
              <div className="mt-1 text-sm font-normal text-muted-foreground">Review administrative history, visibility toggles, and recent governance actions in one place.</div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            <Card className="theme-widget-card">
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>Audit Trail</CardTitle>
                    <CardDescription>Recent access and action changes.</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canViewAdmin && <Button variant="outline" onClick={() => void loadAuditHistory()}>Refresh History</Button>}
                    {canViewAdmin && <Button variant="outline" onClick={() => setShowAuditDetails((current) => !current)}>{showAuditDetails ? "Hide Details" : "View Log"}</Button>}
                    {canDeleteAdmin && <Button variant="destructive" onClick={() => setConfirmDeleteAuditOpen(true)} disabled={!auditRows.length}>Clear Logs</Button>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>Who</TableHead>
                        <TableHead>Module</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.created_at}</TableCell>
                          <TableCell>{row.actor_email ?? "system"}</TableCell>
                          <TableCell>{row.module_key ? <Badge variant="outline">{row.module_key}</Badge> : "-"}</TableCell>
                          <TableCell>{row.project_id ?? "-"}</TableCell>
                          <TableCell><Badge variant="outline">{row.action}</Badge></TableCell>
                        </TableRow>
                      ))}
                      {!auditRows.length && (
                        <TableRow>
                          <TableCell colSpan={5}>
                            <EmptyState
                              icon={RefreshCcw}
                              title="No audit trail history"
                              description="Audit events will appear here once administrative actions are recorded."
                              className="min-h-[170px] border-0 bg-transparent shadow-none"
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {showAuditDetails && auditRows.length > 0 && (
                  <div className="grid gap-4">
                    {auditRows.map((row) => (
                      <div key={`detail-${row.id}`} className="rounded-lg border bg-muted/20 p-4">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Timestamp</p><p className="mt-1 text-sm">{row.created_at}</p></div>
                          <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Actor</p><p className="mt-1 text-sm">{row.actor_email ?? "system"}</p></div>
                          <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Module</p><p className="mt-1 text-sm">{row.module_key ?? "-"}</p></div>
                          <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Project</p><p className="mt-1 text-sm">{row.project_id ?? "-"}</p></div>
                          <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Action</p><p className="mt-1 text-sm">{row.action}</p></div>
                        </div>
                        {row.details && Object.keys(row.details).length > 0 && <pre className="mt-4 overflow-x-auto rounded-md border bg-background p-3 text-xs">{JSON.stringify(row.details, null, 2)}</pre>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Dialog open={organizationDirectoryOpen} onOpenChange={setOrganizationDirectoryOpen}>
        <DialogContent className="max-h-[88vh] max-w-[min(980px,94vw)] overflow-y-auto border-border/70 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/70 px-6 py-5">
            <DialogHeader className="space-y-3 text-left">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <DialogTitle className="text-2xl">Organization Member Directory</DialogTitle>
                  <DialogDescription>
                    {selectedOrganizationGroup
                      ? `Open member access workspaces for ${selectedOrganizationGroup.title} and manage org admins and org users with clarity.`
                      : "Select an organization to review its members."}
                  </DialogDescription>
                </div>
                {selectedOrganizationGroup ? <Badge variant="outline">{selectedOrganizationGroup.rows.length} members</Badge> : null}
              </div>
            </DialogHeader>
          </div>
          <div className="space-y-4 p-6">
            {selectedOrganizationGroup ? (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <MetricCard label="Organization" value={selectedOrganizationGroup.title} />
                  <MetricCard label="Org Admins" value={String(selectedOrganizationGroup.rows.filter((row) => getDisplayRole(row) === "org_admin").length)} />
                  <MetricCard label="Org Users" value={String(selectedOrganizationGroup.rows.filter((row) => getDisplayRole(row) === "org_user").length)} />
                </div>
                <div className="overflow-x-auto rounded-[1.25rem] border border-border/70 bg-card/40">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Approval</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrganizationGroup.rows.map((row) => {
                        const displayRole = getDisplayRole(row);
                        return (
                          <TableRow key={`directory-${row.id}`}>
                            <TableCell>
                              <div className="font-medium">{row.full_name}</div>
                              <div className="text-sm text-muted-foreground">{row.email}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("w-fit text-[10px] uppercase tracking-wider", roleColors[displayRole] || "bg-muted text-muted-foreground")}>{getRoleLabel(displayRole)}</Badge>
                            </TableCell>
                            <TableCell>{row.is_active ? "Active" : "Suspended"}</TableCell>
                            <TableCell>{row.is_approved ? "Approved" : "Pending/Rejected"}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                <Button size="sm" variant="outline" onClick={() => openAccessWorkspace(row.id)}>Manage Access</Button>
                                <Button size="sm" variant="outline" onClick={() => void applyRoleTemplateForUser(row.id, displayRole === "org_admin" ? "buyer_admin" : row.role)}>Apply Template</Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <EmptyState
                icon={Building2}
                title="No organization selected"
                description="Choose an organization section from User Management to inspect its member directory."
                className="min-h-[260px]"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={accessWorkspaceOpen} onOpenChange={setAccessWorkspaceOpen}>
        <DialogContent className="max-h-[92vh] max-w-[min(1380px,96vw)] overflow-y-auto border-border/70 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/70 px-6 py-5">
            <DialogHeader className="space-y-3 text-left">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <DialogTitle className="text-2xl">Organization Access Workspace</DialogTitle>
                  <DialogDescription>
                    {selectedUserRow
                      ? `Manage module, project, and sub-entity visibility for ${selectedUserRow.full_name} in ${getOrganizationLabel(selectedUserRow)}.`
                      : "Select an organization user to manage access."}
                  </DialogDescription>
                </div>
                {selectedUserRow ? (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{getOrganizationLabel(selectedUserRow)}</Badge>
                    <Badge variant="outline">{getRoleLabel(getDisplayRole(selectedUserRow))}</Badge>
                    <Badge variant="outline">User #{selectedUserRow.id}</Badge>
                  </div>
                ) : null}
              </div>
            </DialogHeader>
          </div>

          <div className="space-y-6 p-6">
            <Card className="theme-widget-card">
              <CardHeader>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle>Access Summary</CardTitle>
                    <CardDescription>Role baseline, focused member, and the organization scope for this access workspace.</CardDescription>
                  </div>
                  {selectedUserRow ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <select className="h-10 rounded-md border bg-background px-3 text-sm" value={roleTemplate} onChange={(event) => setRoleTemplate(event.target.value)}>
                        <option value="org_user">Organization User Template</option>
                        <option value="buyer_admin">Organization Admin Template</option>
                        {isElevatedUser ? <option value="super_admin">Super Admin Template</option> : null}
                        {isElevatedUser ? <option value="owner">Owner Template</option> : null}
                      </select>
                      <Button onClick={() => void applyRoleTemplateForUser(selectedUserRow.id)} disabled={!canAssignAdmin}>Apply Role Template</Button>
                    </div>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <MetricCard label="Selected Member" value={selectedUserRow ? selectedUserRow.full_name : "None"} />
                  <MetricCard label="Current Role" value={selectedUserRow ? getRoleLabel(getDisplayRole(selectedUserRow)) : "None"} />
                  <MetricCard label="Organization" value={selectedUserRow ? getOrganizationLabel(selectedUserRow) : "Platform"} />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <Card className="theme-widget-card">
                  <CardHeader>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <CardTitle>Module Access Control</CardTitle>
                        <CardDescription>Selected user: {selectedUserRow ? `${selectedUserRow.full_name} (#${selectedUserRow.id})` : "None"}</CardDescription>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {hasDirtyModuleChanges ? <Badge variant="outline">{dirtyModuleKeys.length} unsaved module change{dirtyModuleKeys.length === 1 ? "" : "s"}</Badge> : null}
                        {canAssignAdmin ? <Button variant="outline" onClick={resetModulePermissionDrafts} disabled={!hasDirtyModuleChanges}>Reset</Button> : null}
                        {canAssignAdmin ? <Button onClick={() => void saveModulePermissions()} disabled={!hasDirtyModuleChanges}>Save Changes</Button> : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Module</TableHead>
                            {PERMISSION_KEYS.map((key) => <TableHead key={key}>{key.replace("can_", "")}</TableHead>)}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {draftModuleAccessRows.map((row) => (
                            <TableRow key={row.module_key}>
                              <TableCell>{row.module_name}</TableCell>
                              {PERMISSION_KEYS.map((key) => (
                                <TableCell key={`${row.module_key}-${key}`}>
                                  <input type="checkbox" checked={Boolean(row[key])} disabled={!canAssignAdmin} onChange={(event) => toggleModulePermission(row.module_key, key, event.target.checked)} />
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                          {!moduleAccessRows.length && (
                            <TableRow>
                              <TableCell colSpan={8}>
                                <EmptyState
                                  icon={ShieldCheck}
                                  title="No module permissions available"
                                  description="Select a user with available governance records to inspect module permissions."
                                  className="min-h-[170px] border-0 bg-transparent shadow-none"
                                />
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                <Card className="theme-widget-card">
                  <CardHeader>
                    <CardTitle>Permission Preview</CardTitle>
                    <CardDescription>Compare permission outcomes across projects, actions, and sub-entities from one workspace panel.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="selectedModule">Module</Label>
                        <select id="selectedModule" className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={selectedModule} onChange={(event) => setSelectedModule(event.target.value)}>
                          {modules.map((row) => <option key={row.module_key} value={row.module_key}>{row.module_name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="selectedProject">Primary Project</Label>
                        <select id="selectedProject" className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={selectedProject} onChange={(event) => setSelectedProject(event.target.value)}>
                          <option value="">No project</option>
                          {projects.map((row) => <option key={row.external_project_id} value={row.external_project_id}>{row.project_name || row.external_project_id}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Actions</Label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-10 w-full justify-between font-normal">
                              <span className="truncate">{summarizeSelection(selectedPreviewActions, "Select actions")}</span>
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-80 overflow-y-auto">
                            {PREVIEW_ACTION_OPTIONS.map((action) => (
                              <DropdownMenuCheckboxItem
                                key={`preview-action-${action}`}
                                checked={selectedPreviewActions.includes(action)}
                                onCheckedChange={(checked) => setSelectedPreviewActions((current) => toggleSelection(current, action, checked === true))}
                              >
                                {action}
                              </DropdownMenuCheckboxItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Projects to Preview</Label>
                      <div className="grid gap-2 md:grid-cols-2">
                        {projects.length ? projects.map((row) => (
                          <label key={`preview-project-${row.external_project_id}`} className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                            <input
                              type="checkbox"
                              checked={selectedPreviewProjects.includes(row.external_project_id)}
                              onChange={(event) => setSelectedPreviewProjects((current) => event.target.checked ? [...current, row.external_project_id] : current.filter((value) => value !== row.external_project_id))}
                            />
                            <span>{row.project_name || row.external_project_id}</span>
                          </label>
                        )) : <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">No projects available for the selected module.</div>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Leave all projects unchecked to preview only the primary project above. Select multiple projects to compare permission outcomes across them.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Sub Entities</Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="h-10 w-full justify-between font-normal" disabled={!subEntities.length || selectedPreviewProjects.length > 1}>
                            <span className="truncate">
                              {summarizeSelection(
                                selectedSubEntityRows.map((row) => row.sub_entity_name),
                                subEntities.length ? "No sub-entity" : "No sub-entities available",
                              )}
                            </span>
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-80 overflow-y-auto">
                          {subEntities.map((row) => (
                            <DropdownMenuCheckboxItem
                              key={`preview-sub-entity-${row.external_sub_entity_id}`}
                              checked={selectedSubEntityIds.includes(row.external_sub_entity_id)}
                              onCheckedChange={(checked) => setSelectedSubEntityIds((current) => toggleSelection(current, row.external_sub_entity_id, checked === true))}
                            >
                              {row.sub_entity_name}
                            </DropdownMenuCheckboxItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {selectedPreviewProjects.length > 1 ? <p className="text-xs text-muted-foreground">Sub-entity preview stays scoped to one project at a time. Leave only one preview project selected to use this filter.</p> : null}
                    </div>

                    {canAssignAdmin ? <Button onClick={() => void previewPermission()}><ShieldCheck className="mr-2 h-4 w-4" />Run Preview</Button> : null}
                    {previewResults.length ? (
                      <div className="space-y-2">
                        {previewResults.map((result) => (
                          <div key={`preview-${result.result_key}`} className={cn("rounded-lg border px-4 py-3 text-sm", result.granted ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-destructive/20 bg-destructive/10 text-destructive")}>
                            <div className="font-medium">{result.project_label}</div>
                            <div className="text-xs uppercase tracking-wide opacity-80">Action: {result.action}{result.sub_entity_id ? ` · Sub-entity: ${result.sub_entity_label}` : ""}</div>
                            <div>{result.granted ? "Granted" : "Denied"} via {result.source}</div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {!subEntities.length ? (
                      <EmptyState
                        icon={ShieldCheck}
                        title="No sub-entities found"
                        description="The selected project does not expose any sub-entity records for granular access control yet."
                        className="min-h-[170px]"
                      />
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteAuditOpen} onOpenChange={setConfirmDeleteAuditOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear audit logs?</AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes audit logs from the database for your accessible scope.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(event) => { event.preventDefault(); void deleteAuditLogs(); }}>Clear Logs</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDeleteOrganizationOpen} onOpenChange={setConfirmDeleteOrganizationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove organization workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedOrganizationDeleteTarget
                ? `This permanently removes ${selectedOrganizationDeleteTarget.organizationName}, its workspace link, org-admin and org-user accounts, invitations, approvals, permissions, and organization-owned records. This action cannot be undone.`
                : "This permanently removes the selected organization workspace and all connected records. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(event) => { event.preventDefault(); void deleteSelectedOrganization(); }}>
              Remove Organization
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
