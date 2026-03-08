export type AdminSectionKey =
  | "access-governance"
  | "owner-governance"
  | "member-requests"
  | "user-management"
  | "audit-trail";

export interface AdminSectionItem {
  key: AdminSectionKey;
  title: string;
  path: string;
  description: string;
  ownerOnly?: boolean;
  requiresAssign?: boolean;
}

export const ADMIN_SECTION_ITEMS: AdminSectionItem[] = [
  {
    key: "access-governance",
    title: "Access Governance Center",
    path: "/admin/access-governance",
    description: "Platform-wide governance metrics and admin workspace status.",
  },
  {
    key: "owner-governance",
    title: "Owner Approval Queue and Organization Directory",
    path: "/admin/owner-governance",
    description: "Owner review lane for organizations, platform users, and tenant directory oversight.",
    ownerOnly: true,
  },
  {
    key: "member-requests",
    title: "Organization Member Requests",
    path: "/admin/member-requests",
    description: "Review pending organization self-signup requests.",
    requiresAssign: true,
  },
  {
    key: "user-management",
    title: "User Management and Invitation Studio",
    path: "/admin/user-management",
    description: "Manage users, invitations, role hierarchy, and access entry points.",
  },
  {
    key: "audit-trail",
    title: "Audit Trail",
    path: "/admin/audit-trail",
    description: "Review administrative actions and governance history.",
  },
];

export const DEFAULT_ADMIN_SECTION_PATH = ADMIN_SECTION_ITEMS[0].path;

export function getAdminSectionFromPath(pathname: string): AdminSectionKey | null {
  const normalized = pathname.trim().toLowerCase();
  const match = ADMIN_SECTION_ITEMS.find((item) => normalized === item.path);
  return match?.key ?? null;
}

export function getAdminSectionTitle(pathname: string): string | null {
  const normalized = pathname.trim().toLowerCase();
  const match = ADMIN_SECTION_ITEMS.find((item) => normalized === item.path);
  return match?.title ?? null;
}