import { AppVariantRenderer } from "@/components/app-shell/AppVariantRenderer";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return <AppVariantRenderer>{children}</AppVariantRenderer>;
}
