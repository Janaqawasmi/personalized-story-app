import RequireRole from "./RequireRole";

/**
 * Admin-only route guard. Thin wrapper over {@link RequireRole} so all
 * role-gating (loading/flash handling, unauthenticated → login,
 * authenticated-but-wrong-role → public home) lives in one place.
 */
export default function RequireAdmin() {
  return <RequireRole allowedRoles={["admin"]} />;
}
