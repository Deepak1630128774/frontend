import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, CheckCircle2, Eye, EyeOff, Home } from "lucide-react";

import heroBg from "@/assets/hero-bg.png";
import { api } from "@/api/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppVariantSystem } from "@/components/app-shell/AppVariantProvider";
import { useWebsiteVariantSystem } from "@/components/website/WebsiteVariantProvider";
import { WebsiteFooter } from "@/components/website/WebsiteFooter";
import { WebsiteHeader } from "@/components/website/WebsiteHeader";
import { ThemeModeToggle, ThemeSelector } from "@/components/theme/ThemeControls";
import { ExperienceVariantToggle } from "@/components/variants/ExperienceVariantToggle";

import { useAuth } from "../auth";
import { buildPlatformSiteUrl, buildTenantWorkspaceUrl, fetchTenantWorkspaceContext, formatTenantName, getTenantSlugFromHostname, slugifyTenantName } from "../lib/tenant";

type LoginMode = "login" | "register" | "forgot" | "reset" | "verify" | "invite";
type SignupKind = "normal_user" | "organization";
type PendingSignupType = SignupKind | "tenant_member";

const REMEMBER_EMAIL_KEY = "energyos_remembered_email";
const REMEMBER_PREF_KEY = "energyos_remember_preference";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function LoginPage() {
  const { login, loginWithToken } = useAuth();
  const { activeAppVariant } = useAppVariantSystem();
  const { activeWebsiteVariant } = useWebsiteVariantSystem();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedTenantSlug = useMemo(() => getTenantSlugFromHostname(), []);
  const isNewExperience = activeAppVariant === "command" && activeWebsiteVariant === "editorial";

  const [mode, setMode] = useState("login" as LoginMode);
  const [signupKind, setSignupKind] = useState("organization" as SignupKind);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [purchaseReference, setPurchaseReference] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [pendingSignupId, setPendingSignupId] = useState(null as number | null);
  const [pendingSignupType, setPendingSignupType] = useState("organization" as PendingSignupType);
  const [inviteToken, setInviteToken] = useState("");
  const [inviteOrganizationName, setInviteOrganizationName] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [tenantLookupState, setTenantLookupState] = useState(requestedTenantSlug ? "checking" as const : "idle" as const);

  const isTenantWorkspace = Boolean(tenantSlug);
  const isCheckingRequestedTenant = Boolean(requestedTenantSlug) && tenantLookupState === "checking";
  const showWorkspaceNotFound = Boolean(requestedTenantSlug) && tenantLookupState === "not-found";

  const organizationSlugPreview = useMemo(() => {
    if (isTenantWorkspace || signupKind !== "organization") {
      return "";
    }

    return organizationName.trim() ? slugifyTenantName(organizationName) : "";
  }, [isTenantWorkspace, organizationName, signupKind]);
  const organizationWorkspacePreview = useMemo(() => {
    if (!organizationSlugPreview) {
      return "";
    }

    return buildTenantWorkspaceUrl(organizationSlugPreview) ?? "";
  }, [organizationSlugPreview]);
  const organizationWorkspacePreviewHost = useMemo(
    () => organizationWorkspacePreview.replace(/^https?:\/\//, ""),
    [organizationWorkspacePreview],
  );
  const platformHomeUrl = useMemo(() => buildPlatformSiteUrl("/") ?? "/", []);
  const platformLoginUrl = useMemo(() => buildPlatformSiteUrl("/login") ?? "/login", []);
  const requestedWorkspaceHost = useMemo(
    () => (typeof window !== "undefined" ? window.location.host : `${requestedTenantSlug}.localhost`),
    [requestedTenantSlug],
  );

  useEffect(() => {
    let cancelled = false;

    if (!requestedTenantSlug) {
      setTenantSlug("");
      setTenantName("");
      setTenantLookupState("idle");
      return;
    }

    setTenantLookupState("checking");

    void fetchTenantWorkspaceContext().then((context) => {
      if (cancelled) {
        return;
      }

      if (context.scope === "organization" && context.organization_slug) {
        setTenantSlug(context.organization_slug);
        setTenantName(context.organization_name?.trim() || formatTenantName(context.organization_slug));
        setTenantLookupState("resolved");
        return;
      }

      setTenantSlug("");
      setTenantName("");
      setTenantLookupState("not-found");
    });

    return () => {
      cancelled = true;
    };
  }, [requestedTenantSlug]);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY) ?? "";
    const rememberedPreference = localStorage.getItem(REMEMBER_PREF_KEY) === "true";

    if (rememberedEmail) {
      setEmail(rememberedEmail);
    }

    setRememberMe(rememberedPreference);
  }, []);

  useEffect(() => {
    localStorage.setItem(REMEMBER_PREF_KEY, String(rememberMe));

    if (rememberMe && email.trim()) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
      return;
    }

    if (!rememberMe) {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }
  }, [email, rememberMe]);

  useEffect(() => {
    const token = new URLSearchParams(location.search).get("token") ?? "";
    if (location.pathname.toLowerCase() === "/reset-password" && token) {
      setResetToken(token);
      setMode("reset");
      setError("");
      setMessage("");
      return;
    }

    if (mode === "reset") {
      setMode("login");
      setResetToken("");
    }
  }, [location.pathname, location.search, mode]);

  useEffect(() => {
    const invite = new URLSearchParams(location.search).get("invite") ?? "";
    if (!invite) {
      return;
    }

    setIsLoading(true);
    setError("");
    setMessage("");

    void api
      .get<{ organization_name: string; email: string; role: string }>(`/api/auth/invitations/${invite}`)
      .then((details) => {
        setInviteToken(invite);
        setInviteOrganizationName(details.organization_name);
        setInviteRole(details.role);
        setEmail(details.email);
        setMode("invite");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Unable to load invitation");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [location.search]);

  const isForgotMode = mode === "forgot";

  const description = useMemo(() => {
    if (isTenantWorkspace) {
      if (mode === "register") return `Request member access for ${tenantName}. Your email is verified first, then the request goes to an organization admin for review.`;
      if (mode === "forgot") return `Request a password reset link for your ${tenantName} workspace account.`;
      if (mode === "reset") return `Set a new password to regain access to ${tenantName}.`;
      if (mode === "invite") return `Accept your ${tenantName} invitation and activate your workspace access.`;
      return `Sign in with your approved ${tenantName} organization account, or request new member access for org-admin review.`;
    }
    if (mode === "register") {
      return signupKind === "organization"
        ? "Create an organization workspace, verify the email OTP, and send it into owner approval."
        : "Create a normal user account, verify the email OTP, and wait for owner approval.";
    }
    if (mode === "forgot") return "Request a secure password reset link for your account.";
    if (mode === "reset") return "Choose a new password to finish resetting your account.";
    if (mode === "verify") return "Enter the 6-digit verification code sent to your email to continue the signup flow.";
    if (mode === "invite") return "Accept your organization invitation and enter the workspace with the invited access level.";
    return "Sign in to continue to your climate operations workspace.";
  }, [isTenantWorkspace, mode, signupKind, tenantName]);

  const submitLabel = useMemo(() => {
    if (isLoading) {
      if (mode === "login") return isTenantWorkspace ? "Entering workspace..." : "Signing in...";
      if (mode === "register") return isTenantWorkspace ? "Submitting request..." : "Creating account...";
      if (mode === "forgot") return "Sending link...";
      if (mode === "verify") return "Verifying code...";
      if (mode === "invite") return "Accepting invitation...";
      return "Resetting password...";
    }

    if (mode === "login") return isTenantWorkspace ? `Enter ${tenantName}` : "Sign In";
    if (mode === "register") {
      if (isTenantWorkspace) return `Request Access to ${tenantName}`;
      return signupKind === "organization" ? "Create Organization" : "Create Account";
    }
    if (mode === "forgot") return "Send Reset Link";
    if (mode === "verify") return "Verify Code";
    if (mode === "invite") return "Accept Invitation";
    return "Reset Password";
  }, [isLoading, isTenantWorkspace, mode, signupKind, tenantName]);

  function switchMode(nextMode: LoginMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
    if (nextMode !== "verify") {
      setOtpCode("");
      setPendingSignupId(null);
    }
  }

  function openOrganizationSignup() {
    setSignupKind("organization");
    switchMode("register");
  }

  async function run(action: () => Promise<void>) {
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();

    if (mode === "register") {
      if (fullName.trim().length < 2) {
        setError("Full name must be at least 2 characters.");
        return;
      }
      if (!email.trim()) {
        setError("Email is required.");
        return;
      }
      if (password.trim().length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (!isTenantWorkspace && signupKind === "organization" && organizationName.trim().length < 2) {
        setError("Organization name must be at least 2 characters.");
        return;
      }
    }

    if (mode === "login" && (!email.trim() || !password.trim())) {
      setError("Email and password are required.");
      return;
    }

    if (mode === "forgot" && !email.trim()) {
      setError("Email is required.");
      return;
    }

    if (mode === "reset" && newPassword.trim().length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (mode === "verify" && (!pendingSignupId || otpCode.trim().length !== 6)) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    if (mode === "invite") {
      if (!inviteToken.trim()) {
        setError("Invitation token is missing.");
        return;
      }
      if (fullName.trim().length < 2) {
        setError("Full name must be at least 2 characters.");
        return;
      }
      if (password.trim().length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
    }

    if (mode === "login") {
      await run(async () => {
        await login(email, password, rememberMe);

        if (rememberMe) {
          localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
        } else {
          localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }

        navigate("/home", { replace: true });
      });
      return;
    }

    if (mode === "register") {
      await run(async () => {
        const response = isTenantWorkspace
          ? await api.post<{ signup_request_id: number; delivery: string; otp_code?: string }>("/api/tenant-auth/member-access/request", {
              full_name: fullName.trim(),
              email: email.trim(),
              password,
            })
          : signupKind === "organization"
            ? await api.post<{ signup_request_id: number; delivery: string; otp_code?: string }>("/api/auth/signup/organization-request", {
                organization_name: organizationName.trim(),
                full_name: fullName.trim(),
                email: email.trim(),
                password,
                purchase_reference: purchaseReference.trim(),
              })
            : await api.post<{ signup_request_id: number; delivery: string; otp_code?: string }>("/api/auth/signup/normal-user-request", {
                full_name: fullName.trim(),
                email: email.trim(),
                password,
              });

        setPendingSignupId(response.signup_request_id);
        setPendingSignupType(isTenantWorkspace ? "tenant_member" : signupKind);
        setOtpCode("");
        setPassword("");
        setMode("verify");
        setMessage(
          response.delivery === "debug" && response.otp_code
            ? `Verification code generated for local use: ${response.otp_code}`
            : isTenantWorkspace
              ? "Verification code sent. Enter it to submit your workspace access request."
              : "Verification code sent. Enter it to complete signup."
        );
      });
      return;
    }

    if (mode === "verify") {
      await run(async () => {
        const response = pendingSignupType === "tenant_member"
          ? await api.post<{ message?: string }>("/api/tenant-auth/member-access/verify-code", {
              signup_request_id: pendingSignupId,
              code: otpCode.trim(),
            })
          : await api.post<{ message?: string; workspace_url?: string }>("/api/auth/signup/verify-otp", {
              signup_request_id: pendingSignupId,
              code: otpCode.trim(),
            });
        setOtpCode("");
        setPendingSignupId(null);
        switchMode("login");
        const workspaceHost = response.workspace_url?.replace(/^https?:\/\//, "");
        setMessage(
          pendingSignupType === "organization" && workspaceHost
            ? `${response.message ?? "Verification complete."} Your workspace link ${workspaceHost} is created after organization setup and will open once owner approval is complete.`
            : (response.message ?? "Verification complete. You can sign in after approval."),
        );
      });
      return;
    }

    if (mode === "forgot") {
      await run(async () => {
        await api.post("/api/auth/forgot-password", { email: email.trim() });
        setMessage("If the account exists, a reset link has been sent.");
      });
      return;
    }

    if (mode === "reset") {
      await run(async () => {
        await api.post("/api/auth/reset-password", {
          token: resetToken,
          new_password: newPassword,
        });
        setNewPassword("");
        setResetToken("");
        switchMode("login");
        navigate("/login", { replace: true });
        setMessage("Password reset complete. Please sign in.");
      });
      return;
    }

    if (mode === "invite") {
      await run(async () => {
        const response = await api.post<{ access_token: string }>("/api/auth/invitations/accept", {
          token: inviteToken,
          full_name: fullName.trim(),
          password,
        });
        await loginWithToken(response.access_token, rememberMe);
        navigate("/home", { replace: true });
      });
      return;
    }
  }

  const authCard = (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      custom={0}
      className={[
        "theme-auth-card w-full max-w-xl border p-6 backdrop-blur-xl sm:p-8",
        isNewExperience
          ? "rounded-[2.35rem]"
          : "rounded-[2rem]",
      ].join(" ")}
    >
      <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-primary">
            {isTenantWorkspace ? `${tenantName} Workspace` : "Workspace access"}
          </div>
          <h2 className="theme-hero-text mt-3 text-4xl font-semibold">
            {isTenantWorkspace
              ? mode === "register"
                ? `Request access to ${tenantName}`
                : mode === "verify"
                  ? "Verify your email"
                  : mode === "invite"
                    ? "Activate your invitation"
                    : isForgotMode
                      ? "Recover workspace access"
                      : mode === "reset"
                        ? "Set a new password"
                        : `Enter ${tenantName}`
              : mode === "register"
                ? signupKind === "organization"
                  ? "Create your workspace"
                  : "Create your account"
                : mode === "verify"
                  ? "Verify your email"
                  : mode === "invite"
                    ? "Accept invitation"
                    : isForgotMode
                      ? "Recover access"
                      : "Enter EnergyOS"}
          </h2>
            <p className="theme-hero-copy mt-3 max-w-lg text-sm leading-7">
              {isNewExperience && !isTenantWorkspace && mode === "login"
                ? "Sign in to continue to your climate operations workspace."
                : description}
            </p>
      </div>

      {!isForgotMode && mode !== "reset" && mode !== "verify" && mode !== "invite" && (
        <div
          className={[
            "theme-pill-group mt-8 inline-flex rounded-full border p-1",
            isNewExperience ? "shadow-[0_16px_40px_hsl(var(--shadow-color)/0.12)]" : "",
          ].join(" ")}
        >
          <button
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === "login" ? "theme-pill-option-active" : "theme-pill-option"}`}
            onClick={() => switchMode("login")}
            disabled={isLoading}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === "register" ? "theme-pill-option-active" : "theme-pill-option"}`}
            onClick={() => switchMode("register")}
            disabled={isLoading}
          >
            {isTenantWorkspace ? "Request access" : "Sign up"}
          </button>
        </div>
      )}

      {isTenantWorkspace && mode === "login" && (
        <div className="theme-info-banner mt-8 rounded-[1.5rem] border px-4 py-3 text-sm leading-7">
          This workspace is for approved members of <span className="theme-hero-text">{tenantName}</span>. New users can request access here or accept an invitation from an organization admin.
        </div>
      )}

      {isTenantWorkspace && mode === "register" && (
        <div className="theme-info-banner mt-8 rounded-[1.5rem] border px-4 py-3 text-sm leading-7">
          Your request will create a pending member application for <span className="theme-hero-text">{tenantName}</span>. After email verification, an organization admin must approve it before you can sign in.
        </div>
      )}

      {(error || message) && (
        <div className="mt-6 space-y-3">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {message && (
            <Alert>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {(mode === "register" || mode === "invite") && (
          <Input id="fullName" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={isLoading} className="h-12" />
        )}

        <Input id="email" type="email" placeholder="Work email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading || mode === "invite"} className="h-12" />

        {mode === "register" && !isTenantWorkspace && (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${signupKind === "organization" ? "border-primary bg-primary/12 text-foreground" : "border-border/70 bg-card/45 text-muted-foreground"}`}
                onClick={() => setSignupKind("organization")}
                disabled={isLoading}
              >
                Organization signup
              </button>
              <button
                type="button"
                className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${signupKind === "normal_user" ? "border-primary bg-primary/12 text-foreground" : "border-border/70 bg-card/45 text-muted-foreground"}`}
                onClick={() => setSignupKind("normal_user")}
                disabled={isLoading}
              >
                Normal user signup
              </button>
            </div>
            {signupKind === "organization" && (
              <>
                <Input id="organizationName" placeholder="Organization name" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} disabled={isLoading} className="h-12" />
                {organizationWorkspacePreviewHost && (
                  <div className="theme-soft-panel rounded-2xl border px-4 py-3 text-sm leading-7">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Workspace link after setup</div>
                    <div className="theme-hero-text mt-2 break-all font-medium">{organizationWorkspacePreviewHost}</div>
                    <p className="mt-2 text-muted-foreground">
                      The workspace link starts from your organization name and is created only after organization setup completes.
                    </p>
                  </div>
                )}
                <Input id="purchaseReference" placeholder="Purchase reference" value={purchaseReference} onChange={(e) => setPurchaseReference(e.target.value)} disabled={isLoading} className="h-12" />
              </>
            )}
          </>
        )}

        {(mode === "login" || mode === "register" || mode === "invite") && (
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={mode === "register" || mode === "invite" ? "Create password" : "Password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="h-12 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={isLoading}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        )}

        {mode === "verify" && (
          <div className="space-y-3">
            <div className="theme-soft-panel rounded-2xl border px-4 py-3 text-sm">
              {pendingSignupType === "organization"
                ? organizationWorkspacePreviewHost
                  ? `Organization email is verified first. After setup completes, ${organizationWorkspacePreviewHost} is created and the workspace moves to owner approval.`
                  : "Organization email verified first, then the signup moves to owner approval."
                : pendingSignupType === "tenant_member"
                  ? "Email verification completes first, then the request moves to your organization admin review queue."
                  : "Normal user email verified first, then the account moves to owner approval."}
            </div>
            <Input
              id="otpCode"
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit verification code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              disabled={isLoading}
              className="h-12 tracking-[0.35em]"
            />
          </div>
        )}

        {mode === "invite" && (
          <div className="theme-soft-panel rounded-2xl border px-4 py-3 text-sm leading-7">
            Joining <span className="theme-hero-text">{inviteOrganizationName}</span> as <span className="theme-hero-text">{inviteRole}</span>.
          </div>
        )}

        {mode === "reset" && (
          <div className="relative">
            <Label htmlFor="newPassword" className="mb-2 block text-sm text-foreground">New password</Label>
            <Input
              id="newPassword"
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isLoading}
              className="h-12 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={isLoading}
              className="absolute right-4 top-[calc(50%+14px)] -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          {!isForgotMode && mode !== "reset" && mode !== "verify" && (
            <div className="flex items-center space-x-2">
              <Checkbox id="remember" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(Boolean(checked))} disabled={isLoading} />
              <Label htmlFor="remember" className="cursor-pointer text-sm font-normal text-muted-foreground">Remember me</Label>
            </div>
          )}

          {mode === "login" && (
            <button type="button" className="font-medium text-primary hover:text-foreground" onClick={() => switchMode("forgot")} disabled={isLoading}>
              Forgot your password?
            </button>
          )}

          {(mode === "forgot" || mode === "reset") && (
            <button type="button" className="font-medium text-primary hover:text-foreground" onClick={() => switchMode("login")} disabled={isLoading}>
              Back to sign in
            </button>
          )}

          {(mode === "verify" || mode === "invite") && (
            <button type="button" className="font-medium text-primary hover:text-foreground" onClick={() => switchMode("login")} disabled={isLoading}>
              Cancel and sign in
            </button>
          )}
        </div>

        {!isTenantWorkspace && mode === "login" && (
          <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
            Want to register as an organization?{" "}
            <button
              type="button"
              className="font-medium text-primary transition-colors hover:text-foreground"
              onClick={openOrganizationSignup}
              disabled={isLoading}
            >
              Click here
            </button>
            .
          </div>
        )}

        <Button type="submit" className="h-12 w-full text-base" disabled={isLoading}>
          {submitLabel}
          {!isLoading && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>
    </motion.div>
  );

  const workspaceNotFoundCard = (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      custom={0}
      className={[
        "theme-auth-card w-full max-w-xl border p-6 backdrop-blur-xl sm:p-8",
        isNewExperience ? "rounded-[2.35rem]" : "rounded-[2rem]",
      ].join(" ")}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-primary">Workspace not found</div>
      <h2 className="theme-hero-text mt-3 text-4xl font-semibold">{requestedTenantSlug ? `${formatTenantName(requestedTenantSlug)} is not active yet.` : "Workspace not found."}</h2>
      <p className="theme-hero-copy mt-3 text-sm leading-7">
        No approved organization workspace is connected to <span className="theme-hero-text">{requestedWorkspaceHost}</span>. This address cannot be used for member sign-in until the organization is created and approved.
      </p>
      <div className="theme-soft-panel mt-8 rounded-2xl border px-4 py-4 text-sm leading-7">
        Create the organization from the main platform first. Once approval is complete, this workspace URL will become active automatically.
      </div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button type="button" className="h-12 flex-1 text-base" onClick={() => { window.location.href = platformLoginUrl; }}>
          Go To Platform Login
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" className="h-12 flex-1 text-base" onClick={() => { window.location.href = platformLoginUrl; }}>
          Create Organization
        </Button>
      </div>
    </motion.div>
  );

  const resolverCard = (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      custom={0}
      className={[
        "theme-auth-card w-full max-w-xl border p-6 backdrop-blur-xl sm:p-8",
        isNewExperience ? "rounded-[2.35rem]" : "rounded-[2rem]",
      ].join(" ")}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-primary">Checking workspace</div>
      <h2 className="theme-hero-text mt-3 text-4xl font-semibold">Resolving {requestedTenantSlug ? formatTenantName(requestedTenantSlug) : "workspace"}</h2>
      <p className="theme-hero-copy mt-3 text-sm leading-7">
        Verifying whether this hostname is connected to an approved organization workspace.
      </p>
    </motion.div>
  );

  const tenantFooter = (
    <footer className="theme-footer-surface border-t border-primary/10">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-primary/35 bg-primary/10 text-primary">
                <BarChart3 className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">{tenantName || "Organization"}</div>
                <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Workspace Access Portal</div>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Approved members can sign in here, while onboarding, approvals, and organization creation remain available on the main platform.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Workspace</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><a href="/login" className="transition-colors hover:text-foreground">Member Sign In</a></li>
              <li><a href="/login" className="transition-colors hover:text-foreground">Request Access</a></li>
              <li><a href={platformHomeUrl} className="transition-colors hover:text-foreground">Main Platform</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Assurance</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><Link to="/assurance" className="transition-colors hover:text-foreground">Assurance Overview</Link></li>
              <li><Link to="/privacy" className="transition-colors hover:text-foreground">Privacy</Link></li>
              <li><Link to="/security" className="transition-colors hover:text-foreground">Security</Link></li>
              <li><Link to="/compliance" className="transition-colors hover:text-foreground">Compliance</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Support</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><a href={platformLoginUrl} className="transition-colors hover:text-foreground">Platform Login</a></li>
              <li><a href={platformHomeUrl} className="transition-colors hover:text-foreground">Organization Setup</a></li>
              <li><a href="#" className="transition-colors hover:text-foreground">Contact Desk</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-2 border-t border-border/60 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">© 2026 EnergyOS. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <a href="#" className="transition-colors hover:text-foreground">LinkedIn</a>
            <a href="#" className="transition-colors hover:text-foreground">X</a>
            <a href={platformHomeUrl} className="transition-colors hover:text-foreground">Platform Home</a>
          </div>
        </div>
      </div>
    </footer>
  );

  const editorialFooter = (
    <footer className="relative z-10 border-t border-border/50 py-10 text-sm text-muted-foreground">
      <div className="mx-auto grid max-w-5xl gap-8 px-6 lg:grid-cols-[1.4fr_0.8fr_1fr] lg:px-12">
        <div className="space-y-4 text-center lg:text-left">
          <div className="flex items-center justify-center gap-3 lg:justify-start">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BarChart3 className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground">EnergyOS</span>
          </div>
          <p className="max-w-2xl leading-7">A classic canvas-style entry point for workspace access, approvals, and account recovery.</p>
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Experience version</div>
            <ExperienceVariantToggle size="sm" />
          </div>
        </div>

        <div className="text-center lg:text-left">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Platform</h4>
          <ul className="space-y-2 text-xs">
            <li><a href="/#features" className="transition-colors hover:text-foreground">Features</a></li>
            <li><Link to="/login" className="transition-colors hover:text-foreground">Access Portal</Link></li>
          </ul>
        </div>

        <div className="text-center lg:text-left">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Assurance</h4>
          <ul className="space-y-2 text-xs">
            <li><Link to="/assurance" className="transition-colors hover:text-foreground">Assurance Overview</Link></li>
            <li><Link to="/privacy" className="transition-colors hover:text-foreground">Privacy</Link></li>
            <li><Link to="/security" className="transition-colors hover:text-foreground">Security</Link></li>
            <li><Link to="/compliance" className="transition-colors hover:text-foreground">Compliance</Link></li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-5xl border-t border-border/50 px-6 pt-6 text-center lg:px-12 lg:text-left">
        <p>© 2026 EnergyOS. All rights reserved.</p>
      </div>
    </footer>
  );

  const editorialTenantFooter = (
    <footer className="relative z-10 border-t border-border/50 py-10 text-sm text-muted-foreground">
      <div className="mx-auto grid max-w-5xl gap-8 px-6 lg:grid-cols-[1.4fr_0.8fr_1fr] lg:px-12">
        <div className="space-y-4 text-center lg:text-left">
          <div className="flex items-center justify-center gap-3 lg:justify-start">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BarChart3 className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground">{tenantName || "Organization"}</span>
          </div>
          <p className="max-w-2xl leading-7">A classic tenant access portal for approved members, with organization onboarding and approvals continuing on the main platform.</p>
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Experience version</div>
            <ExperienceVariantToggle size="sm" />
          </div>
        </div>

        <div className="text-center lg:text-left">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Workspace</h4>
          <ul className="space-y-2 text-xs">
            <li><Link to="/login" className="transition-colors hover:text-foreground">Member Sign In</Link></li>
            <li><Link to="/login" className="transition-colors hover:text-foreground">Request Access</Link></li>
            <li><a href={platformHomeUrl} className="transition-colors hover:text-foreground">Main Platform</a></li>
          </ul>
        </div>

        <div className="text-center lg:text-left">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Assurance</h4>
          <ul className="space-y-2 text-xs">
            <li><Link to="/assurance" className="transition-colors hover:text-foreground">Assurance Overview</Link></li>
            <li><Link to="/privacy" className="transition-colors hover:text-foreground">Privacy</Link></li>
            <li><Link to="/security" className="transition-colors hover:text-foreground">Security</Link></li>
            <li><Link to="/compliance" className="transition-colors hover:text-foreground">Compliance</Link></li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-5xl border-t border-border/50 px-6 pt-6 text-center lg:px-12 lg:text-left">
        <p>© 2026 EnergyOS. All rights reserved.</p>
      </div>
    </footer>
  );

  return (
    <>
      {!isTenantWorkspace && !isNewExperience && <WebsiteHeader />}

      {!isTenantWorkspace && isNewExperience && (
        <div className="theme-header-surface fixed left-0 right-0 top-0 z-50 border-b border-border/50 backdrop-blur-xl">
          <div className="theme-wide-shell mx-auto flex h-20 items-center justify-between gap-6 px-4 sm:px-6">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/35 bg-primary/10 text-primary shadow-[0_8px_24px_hsl(var(--primary)/0.16)]">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div className="font-semibold uppercase tracking-[0.24em] text-primary">EnergyOS</div>
            </Link>

            <nav className="hidden items-center gap-10 md:flex">
              <Link to="/#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                Features
              </Link>
              <Link to="/assurance" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                Assurance
              </Link>
            </nav>

            <div className="flex items-center gap-2">
              <ThemeSelector compact />
              <ThemeModeToggle compact />
            </div>
          </div>
        </div>
      )}

      {isTenantWorkspace && !isNewExperience && (
        <div className="theme-header-surface fixed left-0 right-0 top-0 z-50 border-b border-border/50 backdrop-blur-xl">
          <div className="theme-wide-shell mx-auto flex h-20 items-center justify-between px-4 sm:px-6">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">Organization Access</div>
              <div className="theme-hero-copy mt-2 text-sm">{tenantName} members sign in here with their approved workspace account.</div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={platformHomeUrl}
                aria-label="Go to platform home"
                title="Platform home"
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-card/70 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Home className="h-5 w-5" />
              </a>
              <ThemeSelector compact />
              <ThemeModeToggle compact />
            </div>
          </div>
        </div>
      )}

      {isTenantWorkspace && isNewExperience && (
        <div className="theme-header-surface fixed left-0 right-0 top-0 z-50 border-b border-border/50 backdrop-blur-xl">
          <div className="theme-wide-shell mx-auto flex h-20 items-center justify-between gap-6 px-4 sm:px-6">
            <a href={platformHomeUrl} className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_12px_36px_hsl(var(--primary)/0.24)]">
                <Home className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold uppercase tracking-[0.24em] text-foreground">{tenantName}</div>
                <div className="truncate text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Workspace access portal</div>
              </div>
            </a>

            <nav className="hidden items-center gap-8 md:flex">
              <a href={platformHomeUrl} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                Platform Home
              </a>
              <Link to="/assurance" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                Assurance
              </Link>
            </nav>

            <div className="flex items-center gap-2">
              <ThemeSelector compact />
              <ThemeModeToggle compact />
            </div>
          </div>
        </div>
      )}

      <div
        className={[
          "theme-auth-shell relative overflow-hidden pt-24",
          isNewExperience ? "before:absolute before:inset-x-0 before:top-0 before:h-48 before:bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.18),transparent_70%)] before:content-['']" : "",
        ].join(" ")}
      >
        <div className="absolute inset-0">
          <img src={heroBg} alt="Background" className={`h-full w-full object-cover ${isNewExperience ? "opacity-20 saturate-0" : "opacity-35"}`} />
          <div className="theme-auth-overlay absolute inset-0" />
        </div>

        <div className={`museum-grid absolute inset-0 ${isNewExperience ? "opacity-20" : "opacity-30"}`} />

        <div
          className={[
            "theme-wide-shell relative mx-auto grid min-h-[calc(100vh-5rem)] gap-10 px-4 py-8 lg:px-6 lg:py-10",
            isNewExperience ? "lg:grid-cols-[1.08fr_0.92fr]" : "lg:grid-cols-[1.08fr_0.92fr]",
          ].join(" ")}
        >
          <section
            className={[
              "theme-auth-panel hidden min-h-[680px] flex-col gap-10 border p-8 backdrop-blur-xl lg:flex xl:gap-14",
              isNewExperience
                ? "rounded-[2.75rem]"
                : "rounded-[2rem]",
            ].join(" ")}
          >
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
              <div
                className={[
                  "inline-flex items-center gap-3 rounded-full border px-4 py-2 text-primary",
                  isNewExperience ? "border-primary/30 bg-primary/12" : "border-primary/35 bg-primary/10",
                ].join(" ")}
              >
                <BarChart3 className="h-4 w-4" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em]">
                  {isTenantWorkspace ? `${tenantName} Workspace` : "EnergyOS"}
                </span>
              </div>
              <h1 className="theme-hero-text theme-reading-lg headline-balance mt-10 text-6xl font-semibold leading-[0.95]">
                {showWorkspaceNotFound
                  ? "This workspace address is not active."
                  : isTenantWorkspace
                  ? `Secure access for ${tenantName} teams.`
                  : "Secure access to your climate operations workspace."}
              </h1>
              <p className="theme-hero-copy theme-reading-lg mt-6 text-base leading-8">
                {showWorkspaceNotFound
                  ? "Organization workspaces appear only after the organization setup is completed and approved on the main platform."
                  : isTenantWorkspace
                  ? "This tenant entry point is reserved for approved organization members. Platform signups, organization onboarding, and owner approvals stay on the main site."
                  : "Use your account to access emissions, energy, strategy, and governance workflows in one place."}
              </p>
            </motion.div>

            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2} className="grid gap-3 md:grid-cols-3">
              {(
                isTenantWorkspace
                  ? [
                      "Approved members enter through the organization workspace.",
                      "New users can request access for org-admin approval.",
                      "Password recovery stays available for active members.",
                    ]
                  : showWorkspaceNotFound
                    ? [
                        "This hostname is not linked to an approved organization.",
                        "Organization setup must finish on the main platform first.",
                        "The workspace URL activates automatically after approval.",
                      ]
                  : [
                      "Access your full workspace from one sign-in.",
                      "Approval, invite, and recovery flows stay available here.",
                      "Themes and preferences remain available from the same account.",
                    ]
              ).map((item) => (
                <div key={item} className="theme-soft-panel rounded-2xl border p-4 text-sm leading-7">
                  <CheckCircle2 className="mb-3 h-4 w-4 text-primary" />
                  {item}
                </div>
              ))}
            </motion.div>
          </section>

          <section className="flex items-center justify-center py-8 lg:py-0">
            {showWorkspaceNotFound ? workspaceNotFoundCard : isCheckingRequestedTenant ? resolverCard : authCard}
          </section>
        </div>
      </div>

      {isTenantWorkspace ? (isNewExperience ? editorialTenantFooter : tenantFooter) : (isNewExperience ? editorialFooter : <WebsiteFooter />)}
    </>
  );
}