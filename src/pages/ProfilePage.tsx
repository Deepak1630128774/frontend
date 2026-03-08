import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth";
import { api } from "@/api/client";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InlineStatus } from "@/components/state-panel";
import { ThemePreferenceGrid } from "@/components/theme/ThemeControls";
import { getPlatformWorkspaceLabel, getWorkspaceDisplayName } from "@/lib/tenant";
import { AlertTriangle, CheckCircle, KeyRound, LogOut, RefreshCcw, Shield, UserRound } from "lucide-react";

type ProfileSummary = {
  font_size: string;
  color_theme: string;
  dark_mode: boolean | number;
  updated_at?: string | null;
  account: {
    id: number;
    full_name: string;
    email: string;
    role: string;
    effective_role: string;
    organization_id: number | null;
    organization_name: string;
    organization_slug: string;
    membership_status: string;
  };
};

const TOKEN_LOCAL_KEY = "decarb_token_local";
export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, token, profile, setProfileSettings, refreshMe, logout } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingIdentity, setIsSavingIdentity] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isRefreshingSummary, setIsRefreshingSummary] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(null);
  const [fontSize, setFontSize] = useState(profile?.font_size || "medium");
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    setFullName(user?.full_name || "");
  }, [user?.full_name]);

  useEffect(() => {
    setFontSize(profile?.font_size || "medium");
  }, [profile?.font_size]);

  useEffect(() => {
    if (!token) {
      return;
    }
    void loadProfileSummary();
  }, [token]);

  const initials = user?.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  const sessionType = localStorage.getItem(TOKEN_LOCAL_KEY) ? "Remembered on this device" : "Current browser session";
  const effectiveRole = profileSummary?.account.effective_role || user?.role || "user";
  const platformWorkspaceLabel = getPlatformWorkspaceLabel(user?.role);
  const workspaceName = getWorkspaceDisplayName({
    role: user?.role,
    organizationName: profileSummary?.account.organization_name,
    organizationSlug: profileSummary?.account.organization_slug,
    tenantScope: user?.tenant_context?.scope,
  });
  const organizationName = workspaceName !== platformWorkspaceLabel
    ? workspaceName
    : user?.organization_id && user?.role !== "owner" && user?.role !== "super_admin"
      ? `Organization #${user.organization_id}`
      : platformWorkspaceLabel;
  const statusLabel = profileSummary?.account.membership_status || "active";

  async function loadProfileSummary() {
    if (!token) {
      return;
    }
    setIsRefreshingSummary(true);
    try {
      const summary = await api.get<ProfileSummary>("/api/admin/profile/me", token);
      setProfileSummary(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile details");
    } finally {
      setIsRefreshingSummary(false);
    }
  }

  const handleSaveSettings = async () => {
    setError("");
    setSuccess("");
    setIsSaving(true);

    try {
      await setProfileSettings({
        font_size: fontSize,
      });
      await loadProfileSummary();
      setSuccess("Profile settings saved successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveIdentity = async () => {
    if (!token) return;

    setError("");
    setSuccess("");
    setIsSavingIdentity(true);

    try {
      await api.put("/api/admin/profile/me/details", { full_name: fullName }, token);
      await refreshMe();
      await loadProfileSummary();
      setSuccess("Personal details updated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update personal details");
    } finally {
      setIsSavingIdentity(false);
    }
  };

  const handleChangePassword = async () => {
    if (!token) return;
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match");
      return;
    }

    setError("");
    setSuccess("");
    setIsChangingPassword(true);

    try {
      await api.post(
        "/api/admin/profile/me/change-password",
        {
          current_password: currentPassword,
          new_password: newPassword,
        },
        token,
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Password changed successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!token) return;

    setError("");
    setSuccess("");
    setIsDeleting(true);

    try {
      await api.del("/api/admin/profile/me", token);
      logout();
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
    } finally {
      setIsDeleting(false);
      setConfirmDeleteOpen(false);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="theme-wide-shell mx-auto space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your account identity, preferences, and security settings.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <InlineStatus state={isRefreshingSummary ? "loading" : "idle"} label="Refreshing account data" />
          <Button variant="outline" onClick={() => void loadProfileSummary()} disabled={isRefreshingSummary || !token}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden">
        <CardContent className="grid gap-6 p-6 md:grid-cols-[auto,1fr] md:items-center md:p-8">
          <Avatar className="h-20 w-20 border border-primary/20">
            <AvatarFallback className="bg-primary text-lg text-primary-foreground">{initials}</AvatarFallback>
          </Avatar>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-foreground">{user?.full_name}</h2>
              <Badge>{effectiveRole.replace(/_/g, " ")}</Badge>
              <Badge variant="secondary">{statusLabel || "active"}</Badge>
            </div>
            <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Organization</div>
                <div className="mt-1 text-foreground">{organizationName}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Session</div>
                <div className="mt-1 text-foreground">{sessionType}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Last updated</div>
                <div className="mt-1 text-foreground">
                  {profileSummary?.updated_at ? new Date(profileSummary.updated_at).toLocaleString() : "Not available"}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user?.email || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" value={effectiveRole.replace(/_/g, " ")} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organization">Organization</Label>
                <Input id="organization" value={organizationName} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sessionType">Session Storage</Label>
                <Input id="sessionType" value={sessionType} disabled />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveIdentity} disabled={isSavingIdentity || !fullName.trim()}>
                <UserRound className="mr-2 h-4 w-4" />
                {isSavingIdentity ? "Saving..." : "Save Personal Details"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold">Account Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Tenant slug</div>
              <p className="mt-2 font-medium text-foreground">{workspaceName}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Account id</div>
              <p className="mt-2 font-medium text-foreground">#{profileSummary?.account.id ?? user?.id ?? "-"}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Access level</div>
              <p className="mt-2 font-medium text-foreground capitalize">{effectiveRole.replace(/_/g, " ")}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Membership status</div>
              <p className="mt-2 font-medium text-foreground capitalize">{statusLabel || "Active"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold">Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fontSize">Font Size</Label>
                <Select value={fontSize} onValueChange={setFontSize}>
                  <SelectTrigger id="fontSize">
                    <SelectValue placeholder="Select font size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ThemePreferenceGrid />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setFontSize(profile?.font_size || "medium"); }}>
                Reset
              </Button>
              <Button onClick={handleSaveSettings} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold">Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4">
              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Password hygiene</p>
                  <p className="mt-1 text-sm text-muted-foreground">Use at least 8 characters and avoid reusing your current password.</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input id="currentPassword" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleChangePassword} disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}>
                <KeyRound className="mr-2 h-4 w-4" />
                {isChangingPassword ? "Updating..." : "Change Password"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-destructive/30">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-medium">Delete My Account</p>
            <p className="text-sm text-muted-foreground mt-1">
              This removes your profile and logs you out immediately. This action cannot be undone.
            </p>
          </div>
          <Separator />
          <div className="flex justify-end">
            <Button variant="destructive" onClick={() => setConfirmDeleteOpen(true)} disabled={isDeleting || !token}>
              {isDeleting ? "Deleting..." : "Delete My Account"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account?</AlertDialogTitle>
            <AlertDialogDescription>
              Your account and related access entries will be removed permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteAccount();
              }}
            >
              {isDeleting ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
