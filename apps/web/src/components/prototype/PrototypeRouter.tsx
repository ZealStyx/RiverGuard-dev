import type { ProductRole } from "@/data/prototype";

import { AppShell } from "./AppShell";
import {
  AuthScreen,
  OnboardingScreen,
  PublicInfoScreen,
  SettingsScreen,
  WelcomeScreen,
} from "./PublicScreens";
import { AdminScreen, LguScreen, ResidentScreen } from "./RoleScreens";
import { ResearcherScreen } from "./ResearcherScreens";

const productRoles: ProductRole[] = ["researcher", "lgu", "resident", "admin"];

export function isProductRole(value: string): value is ProductRole {
  return productRoles.includes(value as ProductRole);
}

export function PrototypeRouter({
  section,
  segments = [],
}: {
  section: string;
  segments?: string[];
}) {
  if (section === "welcome") return <WelcomeScreen />;
  if (
    section === "about" ||
    section === "methodology" ||
    section === "official-sources"
  )
    return <PublicInfoScreen screen={section} />;
  if (section === "auth") return <AuthScreen screen={segments[0] ?? "login"} />;
  if (section === "onboarding") {
    const role = isProductRole(segments[0] ?? "")
      ? (segments[0] as ProductRole)
      : "researcher";
    return <OnboardingScreen role={role} />;
  }
  if (section === "settings") {
    return (
      <AppShell role="researcher">
        <main className="p-4 sm:p-5">
          <SettingsScreen screen={segments[0] ?? "profile"} />
        </main>
      </AppShell>
    );
  }
  if (isProductRole(section)) {
    return (
      <AppShell role={section}>
        <main className="p-4 sm:p-5">
          {section === "researcher" ? (
            <ResearcherScreen segments={segments} />
          ) : null}
          {section === "resident" ? (
            <ResidentScreen segments={segments} />
          ) : null}
          {section === "lgu" ? <LguScreen segments={segments} /> : null}
          {section === "admin" ? <AdminScreen segments={segments} /> : null}
        </main>
      </AppShell>
    );
  }
  return <WelcomeScreen />;
}
