import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RequireRole from "../RequireRole";
import RequireAdmin from "../RequireAdmin";
import { useAuth } from "../../contexts/AuthContext";

jest.mock("../../contexts/AuthContext");
const mockUseAuth = useAuth as unknown as jest.Mock;

function makeUser(role: string | null) {
  return {
    getIdTokenResult: jest
      .fn()
      .mockResolvedValue({ claims: role ? { role } : {} }),
  };
}

function setAuth(opts: { loading?: boolean; role?: string | null; loggedOut?: boolean }) {
  mockUseAuth.mockReturnValue({
    loading: opts.loading ?? false,
    currentUser: opts.loggedOut ? null : makeUser(opts.role ?? null),
  });
}

function renderSpecialistGuard() {
  return render(
    <MemoryRouter initialEntries={["/he/specialist/stories"]}>
      <Routes>
        <Route path="/:lang/login" element={<div>LOGIN PAGE</div>} />
        <Route path="/:lang" element={<div>HOME PAGE</div>} />
        <Route
          path="/:lang/specialist"
          element={<RequireRole allowedRoles={["specialist", "admin"]} />}
        >
          <Route path="stories" element={<div>SPECIALIST DASHBOARD</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

function renderAdminGuard() {
  return render(
    <MemoryRouter initialEntries={["/he/admin/overview"]}>
      <Routes>
        <Route path="/:lang/login" element={<div>LOGIN PAGE</div>} />
        <Route path="/:lang" element={<div>HOME PAGE</div>} />
        <Route path="/:lang/admin" element={<RequireAdmin />}>
          <Route path="overview" element={<div>ADMIN PANEL</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

afterEach(() => {
  jest.clearAllMocks();
});

describe("RequireRole — specialist area", () => {
  it("shows a loading indicator while auth is resolving", () => {
    setAuth({ loading: true });
    renderSpecialistGuard();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByText("SPECIALIST DASHBOARD")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated users to public home (never login, existence hidden)", async () => {
    setAuth({ loggedOut: true });
    renderSpecialistGuard();
    await waitFor(() => expect(screen.getByText("HOME PAGE")).toBeInTheDocument());
    expect(screen.queryByText("LOGIN PAGE")).not.toBeInTheDocument();
    expect(screen.queryByText("SPECIALIST DASHBOARD")).not.toBeInTheDocument();
  });

  it("redirects an authenticated caregiver to public home (no dashboard flash)", async () => {
    setAuth({ role: "caregiver" });
    renderSpecialistGuard();
    await waitFor(() => expect(screen.getByText("HOME PAGE")).toBeInTheDocument());
    expect(screen.queryByText("SPECIALIST DASHBOARD")).not.toBeInTheDocument();
  });

  it("redirects a user with no role claim to public home", async () => {
    setAuth({ role: null });
    renderSpecialistGuard();
    await waitFor(() => expect(screen.getByText("HOME PAGE")).toBeInTheDocument());
  });

  it("allows a specialist into the dashboard", async () => {
    setAuth({ role: "specialist" });
    renderSpecialistGuard();
    await waitFor(() =>
      expect(screen.getByText("SPECIALIST DASHBOARD")).toBeInTheDocument()
    );
  });

  it("allows an admin into the specialist dashboard", async () => {
    setAuth({ role: "admin" });
    renderSpecialistGuard();
    await waitFor(() =>
      expect(screen.getByText("SPECIALIST DASHBOARD")).toBeInTheDocument()
    );
  });
});

describe("RequireAdmin — admin area", () => {
  it("redirects an unauthenticated user to public home (never login)", async () => {
    setAuth({ loggedOut: true });
    renderAdminGuard();
    await waitFor(() => expect(screen.getByText("HOME PAGE")).toBeInTheDocument());
    expect(screen.queryByText("LOGIN PAGE")).not.toBeInTheDocument();
    expect(screen.queryByText("ADMIN PANEL")).not.toBeInTheDocument();
  });

  it("redirects an authenticated specialist to public home (not login)", async () => {
    setAuth({ role: "specialist" });
    renderAdminGuard();
    await waitFor(() => expect(screen.getByText("HOME PAGE")).toBeInTheDocument());
    expect(screen.queryByText("ADMIN PANEL")).not.toBeInTheDocument();
    expect(screen.queryByText("LOGIN PAGE")).not.toBeInTheDocument();
  });

  it("redirects an authenticated caregiver to public home", async () => {
    setAuth({ role: "caregiver" });
    renderAdminGuard();
    await waitFor(() => expect(screen.getByText("HOME PAGE")).toBeInTheDocument());
  });

  it("allows an admin into the admin panel", async () => {
    setAuth({ role: "admin" });
    renderAdminGuard();
    await waitFor(() => expect(screen.getByText("ADMIN PANEL")).toBeInTheDocument());
  });
});
