import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "../LoginPage";
import { auth } from "../../firebase";

// ---------------------------------------------------------------------------
// Focused regression test for the post-login redirect flow (the original bug
// was a hardcoded specialist fallback). This proves LoginPage itself cannot
// send a caregiver into /specialist or /admin via a crafted `returnTo`, and
// that only correctly-roled users reach their internal area.
// ---------------------------------------------------------------------------

// Names must start with "mock" to satisfy jest.mock's out-of-scope rule.
const mockNavigate = jest.fn();
let mockLocation: {
  pathname: string;
  search: string;
  hash: string;
  state: unknown;
};

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ lang: "he" }),
  useLocation: () => mockLocation,
}));

const mockLogin = jest.fn().mockResolvedValue(undefined);
jest.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({
    login: mockLogin,
    signup: jest.fn(),
    ensureCaregiverDoc: jest.fn(),
  }),
}));

jest.mock("../../i18n/useTranslation", () => ({
  useTranslation: () => (key: string) => key,
}));

// LoginPage imports these at module load; the email-login path never calls
// them, but they must exist so the module evaluates.
jest.mock("firebase/auth", () => ({
  signInWithPopup: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

jest.mock("../../firebase", () => ({
  auth: { currentUser: null },
}));

function setSignedInRole(role: string | null) {
  (auth as unknown as { currentUser: unknown }).currentUser = {
    getIdTokenResult: jest
      .fn()
      .mockResolvedValue({ claims: role ? { role } : {} }),
  };
}

function renderLoginWith(returnTo?: string) {
  mockLocation = {
    pathname: "/he/login",
    search: returnTo ? `?returnTo=${returnTo}` : "",
    hash: "",
    // `mode: "login"` auto-opens the email dialog on mount.
    state: { mode: "login" },
  };
  render(<LoginPage />);
}

async function submitEmailLogin() {
  const email = await screen.findByLabelText("Email");
  const password = await screen.findByLabelText("Password");
  fireEvent.change(email, { target: { value: "user@example.com" } });
  fireEvent.change(password, { target: { value: "password123" } });
  fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
}

async function expectRedirect(to: string) {
  await waitFor(() =>
    expect(mockNavigate).toHaveBeenCalledWith(to, { replace: true })
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
  mockLogin.mockClear();
  setSignedInRole(null);
});

describe("LoginPage post-login redirect (returnTo authorization)", () => {
  it("1. caregiver + returnTo=/he/specialist/stories → /he", async () => {
    setSignedInRole("caregiver");
    renderLoginWith("/he/specialist/stories");
    await submitEmailLogin();
    await expectRedirect("/he");
  });

  it("2. caregiver + returnTo=/he/admin/overview → /he", async () => {
    setSignedInRole("caregiver");
    renderLoginWith("/he/admin/overview");
    await submitEmailLogin();
    await expectRedirect("/he");
  });

  it("3. specialist + returnTo=/he/specialist/stories → /he/specialist/stories", async () => {
    setSignedInRole("specialist");
    renderLoginWith("/he/specialist/stories");
    await submitEmailLogin();
    await expectRedirect("/he/specialist/stories");
  });

  it("4. specialist + returnTo=/he/admin/overview → /he", async () => {
    setSignedInRole("specialist");
    renderLoginWith("/he/admin/overview");
    await submitEmailLogin();
    await expectRedirect("/he");
  });

  it("5. admin + returnTo=/he/admin/overview → /he/admin/overview", async () => {
    setSignedInRole("admin");
    renderLoginWith("/he/admin/overview");
    await submitEmailLogin();
    await expectRedirect("/he/admin/overview");
  });

  it("6. admin + returnTo=/he/specialist/stories → /he/specialist/stories", async () => {
    setSignedInRole("admin");
    renderLoginWith("/he/specialist/stories");
    await submitEmailLogin();
    await expectRedirect("/he/specialist/stories");
  });

  it("7. no from and no returnTo → /he", async () => {
    setSignedInRole("caregiver");
    renderLoginWith();
    await submitEmailLogin();
    await expectRedirect("/he");
  });

  it("8a. external returnTo https://evil.com → /he (open-redirect guard)", async () => {
    setSignedInRole("admin");
    renderLoginWith("https://evil.com");
    await submitEmailLogin();
    await expectRedirect("/he");
  });

  it("8b. protocol-relative returnTo //evil.com → /he (open-redirect guard)", async () => {
    setSignedInRole("admin");
    renderLoginWith("//evil.com");
    await submitEmailLogin();
    await expectRedirect("/he");
  });
});
