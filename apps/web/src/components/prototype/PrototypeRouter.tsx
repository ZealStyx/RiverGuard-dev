import type { ProductRole } from "@/data/prototype";

import { WorkspaceGate } from "../auth/WorkspaceGate";
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

const productRoles: ProductRole[] = ["lgu", "resident", "admin"];

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
      : "resident";
    return <OnboardingScreen role={role} />;
  }
  if (section === "settings") {
    return (
      <WorkspaceGate role="admin">
        <AppShell role="admin">
          <main className="p-4 sm:p-5">
            <SettingsScreen screen={segments[0] ?? "profile"} />
          </main>
        </AppShell>
      </WorkspaceGate>
    );
  }
  if (section === "researcher") {
    return (
      <WorkspaceGate role="admin">
        <AppShell role="admin">
          <main className="p-4 sm:p-5">
            <ResearcherScreen segments={segments} />
          </main>
        </AppShell>
      </WorkspaceGate>
    );
  }
  if (isProductRole(section)) {
    return (
      <WorkspaceGate role={section}>
        <AppShell role={section}>
          <main className="p-4 sm:p-5">
            {section === "resident" ? (
              <ResidentScreen segments={segments} />
            ) : null}
            {section === "lgu" ? <LguScreen segments={segments} /> : null}
            {section === "admin" ? <AdminScreen segments={segments} /> : null}
          </main>
        </AppShell>
      </WorkspaceGate>
    );
  }
  return <WelcomeScreen />;
}
