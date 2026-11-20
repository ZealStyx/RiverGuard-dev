// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AuthScreen } from "@/components/prototype/PublicScreens";
import { WorkspaceGate } from "@/components/auth/WorkspaceGate";
const m = vi.hoisted(() => ({
  replace: vi.fn(),
  query: vi.fn(),
  mutation: vi.fn(),
  email: vi.fn(),
  google: vi.fn(),
  create: vi.fn(),
  verify: vi.fn(),
  connected: true,
  account: null as Record<string, unknown> | null,
}));
const credential = {
  uid: "id",
  email: "m@example.org",
  emailVerified: true,
  getIdToken: async () => "firebase-token",
};
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: m.replace }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/auth/login",
}));
vi.mock("@/lib/convex-config", () => ({
  convexConfigured: true,
  convexDeploymentUrl: "https://test.convex.cloud",
}));
vi.mock("convex/browser", async (inherit) => ({
  ...(await inherit<object>()),
  ConvexHttpClient: class {
    setAuth() {}
    query = m.query;
    mutation = m.mutation;
  },
}));
vi.mock("convex/react", async (inherit) => ({
  ...(await inherit<object>()),
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
  useConvexConnectionState: () => ({ isWebSocketConnected: m.connected }),
  useQuery_experimental: () => ({ status: "success", data: m.account }),
}));
let signedIn = false;
vi.mock("@/components/auth/FirebaseAuthProvider", () => ({
  useFirebaseAuth: () => ({
    user: signedIn ? credential : null,
    loading: false,
    signInWithEmail: m.email,
    signInWithGoogle: m.google,
    createAccountWithEmail: m.create,
    sendEmailVerification: m.verify,
  }),
}));
beforeEach(() => {
  vi.resetAllMocks();
  signedIn = false;
  m.connected = true;
  m.account = null;
  m.email.mockResolvedValue(credential);
  m.google.mockResolvedValue(credential);
  m.create.mockResolvedValue({ ...credential, emailVerified: false });
  m.verify.mockResolvedValue(undefined);
});
afterEach(cleanup);
function fill(id: string, value: string) {
  fireEvent.change(document.getElementById(id)!, { target: { value } });
}
async function login(provider: string) {
  render(<AuthScreen screen="login" />);
  if (provider === "Google")
    fireEvent.click(
      screen.getByRole("button", { name: "Sign in with Google" }),
    );
  else {
    fill("login-email", credential.email);
    fill("login-password", "Password123!");
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
  }
}
it.each(["email", "Google"])(
  "existing %s login performs only lookup and uses the existing role",
  async (provider) => {
    m.query.mockResolvedValue({ role: "researcher", status: "active" });
    await login(provider);
    await waitFor(() => expect(m.replace).toHaveBeenCalledWith("/researcher"));
    expect(m.mutation).not.toHaveBeenCalled();
  },
);
it("new Google login opens signup without creating a resident", async () => {
  m.query.mockResolvedValue(null);
  await login("Google");
  await waitFor(() => expect(m.replace).toHaveBeenCalledWith("/auth/signup"));
  expect(m.mutation).not.toHaveBeenCalled();
});
it.each(["email", "Google"])(
  "explicit %s registration submits the chosen role and routes on stored status",
  async (provider) => {
    render(<AuthScreen screen="signup" />);
    fill("signup-name", "Member");
    if (provider === "Google") {
      fill("signup-method", "google");
      fill("signup-role", "researcher");
      fill("signup-organization", "University");
      fill("signup-purpose", "Forecast evaluation");
    } else {
      fill("signup-email", credential.email);
      fill("signup-password", "Password123!");
      fill("signup-confirm", "Password123!");
    }
    fireEvent.click(document.getElementById("signup-terms")!);
    const role = provider === "Google" ? "researcher" : "resident";
    m.mutation.mockResolvedValue({
      role,
      status: role === "resident" ? "active" : "pending",
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));
    await waitFor(() =>
      expect(m.replace).toHaveBeenCalledWith(
        role === "resident" ? "/auth/verify" : "/auth/pending",
      ),
    );
    expect(m.mutation.mock.calls[0][1].requestedRole).toBe(role);
    expect(provider === "Google" ? m.google : m.create).toHaveBeenCalledTimes(
      1,
    );
  },
);
it("database failure during login does not redirect or provision", async () => {
  m.query.mockRejectedValue(new Error("Database unavailable"));
  await login("Google");
  expect(await screen.findByText("Database unavailable")).toBeTruthy();
  expect(m.replace).not.toHaveBeenCalled();
  expect(m.mutation).not.toHaveBeenCalled();
});
it.each([
  ["resident", "active", "admin", "/resident"],
  ["researcher", "pending", "researcher", "/auth/pending"],
] as const)(
  "workspace guard denies %s/%s access to %s",
  async (role, status, workspace, dest) => {
    signedIn = true;
    m.account = { externalId: "id", role, status };
    render(<WorkspaceGate role={workspace}>protected-content</WorkspaceGate>);
    expect(screen.queryByText("protected-content")).toBeNull();
    expect(m.replace).toHaveBeenCalledWith(dest);
  },
);
it("disconnected database denies even a cached active admin record", () => {
  signedIn = true;
  m.connected = false;
  m.account = { externalId: "id", role: "admin", status: "active" };
  render(<WorkspaceGate role="admin">protected-content</WorkspaceGate>);
  expect(screen.queryByText("protected-content")).toBeNull();
});
