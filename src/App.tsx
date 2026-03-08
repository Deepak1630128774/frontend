import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PageLoadingState } from "@/components/state-panel";
import { DEFAULT_ADMIN_SECTION_PATH } from "@/lib/admin-sections";
import { fetchTenantWorkspaceContext, getTenantSlugFromHostname } from "@/lib/tenant";
import { useAuth } from "./auth";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import WorkspaceNotFoundPage from "@/pages/WorkspaceNotFoundPage";
import InfoPage from "@/pages/InfoPage";
import NotFound from "@/pages/NotFound";

const loadDashboardPage = () => import("@/pages/DashboardPage");
const loadHomePage = () => import("@/pages/HomePage");
const loadCo2Page = () => import("@/pages/Co2Page");
const loadFuelEnergyPage = () => import("@/pages/FuelEnergyPage");
const loadMaccPage = () => import("@/pages/MaccPage");
const loadStrategyPage = () => import("@/pages/StrategyPage");
const loadAdminPage = () => import("@/pages/AdminPage");
const loadProfilePage = () => import("@/pages/ProfilePage");

const HomePage = lazy(loadHomePage);
const DashboardPage = lazy(loadDashboardPage);
const Co2Page = lazy(loadCo2Page);
const FuelEnergyPage = lazy(loadFuelEnergyPage);
const MaccPage = lazy(loadMaccPage);
const StrategyPage = lazy(loadStrategyPage);
const AdminPage = lazy(loadAdminPage);
const ProfilePage = lazy(loadProfilePage);

const queryClient = new QueryClient();

const routeFallback = (
  <div className="p-4 md:p-6">
    <PageLoadingState
      title="Loading experience"
      description="Streaming the next section of the platform so the initial bundle stays lighter and faster."
    />
  </div>
);

const ProtectedRoute = ({ element }: { element: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-4 md:p-6">{routeFallback}</div>;
  }

  return user ? <>{element}</> : <Navigate to="/login" replace />;
};

const App = () => {
  const { user, loading } = useAuth();
  const requestedTenantSlug = useMemo(() => getTenantSlugFromHostname(), []);
  const [tenantLookupState, setTenantLookupState] = useState(requestedTenantSlug ? "checking" as const : "idle" as const);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const preloadRoutes = () => {
      void loadHomePage();
      void loadDashboardPage();
      void loadCo2Page();
      void loadFuelEnergyPage();
      void loadMaccPage();
      void loadStrategyPage();
      void loadAdminPage();
      void loadProfilePage();
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(() => preloadRoutes(), { timeout: 1500 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(preloadRoutes, 250);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!requestedTenantSlug) {
      setTenantLookupState("idle");
      return;
    }

    setTenantLookupState("checking");
    void fetchTenantWorkspaceContext().then((context) => {
      if (cancelled) {
        return;
      }

      setTenantLookupState(context.scope === "organization" && context.organization_slug ? "resolved" : "not-found");
    });

    return () => {
      cancelled = true;
    };
  }, [requestedTenantSlug]);

  const showUnknownWorkspace = Boolean(requestedTenantSlug) && tenantLookupState === "not-found";
  const isCheckingUnknownWorkspace = Boolean(requestedTenantSlug) && tenantLookupState === "checking";

  if (loading || isCheckingUnknownWorkspace) {
    return <div className="p-4 md:p-6">{routeFallback}</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={routeFallback}>
            <Routes>
              <Route path="/" element={showUnknownWorkspace ? <WorkspaceNotFoundPage requestedTenantSlug={requestedTenantSlug ?? "workspace"} /> : !user ? <LandingPage /> : <Navigate to="/home" replace />} />
              <Route path="/login" element={showUnknownWorkspace ? <WorkspaceNotFoundPage requestedTenantSlug={requestedTenantSlug ?? "workspace"} /> : !user ? <LoginPage /> : <Navigate to="/home" replace />} />
              <Route path="/reset-password" element={showUnknownWorkspace ? <WorkspaceNotFoundPage requestedTenantSlug={requestedTenantSlug ?? "workspace"} /> : !user ? <LoginPage /> : <Navigate to="/home" replace />} />
              <Route path="/assurance" element={<InfoPage />} />
              <Route path="/privacy" element={<InfoPage />} />
              <Route path="/security" element={<InfoPage />} />
              <Route path="/compliance" element={<InfoPage />} />

              <Route path="/home" element={<ProtectedRoute element={<HomePage />} />} />
              <Route path="/dashboard" element={<ProtectedRoute element={<AppLayout><DashboardPage /></AppLayout>} />} />
              <Route path="/co2" element={<ProtectedRoute element={<AppLayout><Co2Page /></AppLayout>} />} />
              <Route path="/fuel-energy" element={<ProtectedRoute element={<AppLayout><FuelEnergyPage /></AppLayout>} />} />
              <Route path="/macc" element={<ProtectedRoute element={<AppLayout><MaccPage /></AppLayout>} />} />
              <Route path="/strategies" element={<ProtectedRoute element={<AppLayout><StrategyPage /></AppLayout>} />} />
              <Route path="/admin" element={<Navigate to={DEFAULT_ADMIN_SECTION_PATH} replace />} />
              <Route path="/admin/*" element={<ProtectedRoute element={<AppLayout><AdminPage /></AppLayout>} />} />
              <Route path="/profile" element={<ProtectedRoute element={<AppLayout><ProfilePage /></AppLayout>} />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
