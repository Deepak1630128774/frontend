import { createRoot } from "react-dom/client";
import { AuthProvider } from "./auth";
import App from "./App.tsx";
import { AppVariantProvider } from "@/components/app-shell/AppVariantProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { WebsiteVariantProvider } from "@/components/website/WebsiteVariantProvider";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <ThemeProvider>
      <AppVariantProvider>
        <WebsiteVariantProvider>
          <App />
        </WebsiteVariantProvider>
      </AppVariantProvider>
    </ThemeProvider>
  </AuthProvider>
);
