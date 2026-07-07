// client/src/utils/roleAccess.ts
//
// Small, pure helpers for role-based route access. Shared by the login
// redirect logic (LoginPage) and the RequireRole route guard so there is a
// single source of truth for "which roles may enter /specialist and /admin".

export type AppRole = string | null | undefined;

/** Roles allowed into the specialist dashboard. Admins are always allowed. */
export const SPECIALIST_ROLES: ReadonlySet<string> = new Set(["specialist", "admin"]);

/** Roles allowed into the admin panel. */
export const ADMIN_ROLES: ReadonlySet<string> = new Set(["admin"]);

/**
 * Returns the elevated role area a path belongs to, or null for public /
 * auth-only routes. Language prefixes (/he, /ar, /en) are irrelevant because
 * we match the `/specialist` and `/admin` segments anywhere in the path.
 */
export function requiredAreaForPath(path: string): "admin" | "specialist" | null {
  if (/\/admin(\/|$)/.test(path)) return "admin";
  if (/\/specialist(\/|$)/.test(path)) return "specialist";
  return null;
}

/** Whether `role` may enter the given elevated area. */
export function roleCanAccessArea(
  area: "admin" | "specialist" | null,
  role: AppRole
): boolean {
  if (area === null) return true;
  if (!role) return false;
  if (area === "admin") return ADMIN_ROLES.has(role);
  return SPECIALIST_ROLES.has(role);
}

/**
 * Whether a user with `role` is allowed to open `path`. Public / auth-only
 * paths always return true here — this helper only reasons about the
 * specialist/admin elevated areas.
 */
export function isPathAllowedForRole(path: string, role: AppRole): boolean {
  return roleCanAccessArea(requiredAreaForPath(path), role);
}

/** True only for safe, internal, single-slash-relative paths. */
export function isSafeInternalPath(path: unknown): path is string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//");
}
