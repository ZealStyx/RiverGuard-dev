import type { ProductRole } from "@/data/prototype";

import { WorkspaceGate } from "../auth/WorkspaceGate";
import { AppShell } from "./AppShell";
import {
  AuthScreen,
  OnboardingScreen,
  PublicInfoScreen,
  WelcomeScreen,
  WorkspaceMethodologyScreen,
  WorkspaceSettingsScreen,
} from "./PublicScreens";
import { AdminScreen, LguScreen, ResidentScreen } from "./RoleScreens";
import { ResearcherScreen } from "./ResearcherScreens";

const productRoles: ProductRole[] = ["lgu", "resident", "researcher", "admin"];

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
  if (section === "about" || section === "official-sources")
    return (
      <PublicInfoScreen screen={section as "about" | "official-sources"} />
    );
  // Help & limitations renders inside the workspace shell, so following the
  // sidebar link keeps the navigation instead of dropping to a public page.
  if (section === "methodology") return <WorkspaceMethodologyScreen />;
  if (section === "auth") return <AuthScreen screen={segments[0] ?? "login"} />;
  if (section === "onboarding") {
    const role = isProductRole(segments[0] ?? "")
      ? (segments[0] as ProductRole)
      : "resident";
    return <OnboardingScreen role={role} />;
  }
  if (section === "settings")
    return <WorkspaceSettingsScreen initialSection={segments[0]} />;
  if (isProductRole(section) && segments[0] === "settings") {
    return (
      <WorkspaceSettingsScreen role={section} initialSection={segments[1]} />
    );
  }
  if (isProductRole(section) && segments[0] === "help") {
    return <WorkspaceMethodologyScreen role={section} />;
  }
  if (section === "researcher") {
    return (
      <WorkspaceGate role="researcher">
        <AppShell role="researcher" variant="research">
          <main className="workspace-page mx-auto min-h-screen max-w-[96rem] p-4 sm:p-5 lg:p-6">
            <ResearcherScreen segments={segments} />
          </main>
        </AppShell>
      </WorkspaceGate>
    );
  }
  if (isProductRole(section)) {
    return (
      <WorkspaceGate role={section}>
        <AppShell
          role={section}
          variant={
            section === "researcher"
              ? "research"
              : section === "resident"
                ? "resident"
                : "default"
          }
        >
          <main className="workspace-page mx-auto min-h-screen max-w-[96rem] p-4 sm:p-5 lg:p-6">
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
