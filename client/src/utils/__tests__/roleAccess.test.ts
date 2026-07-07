import {
  requiredAreaForPath,
  roleCanAccessArea,
  isPathAllowedForRole,
  isSafeInternalPath,
} from "../roleAccess";

describe("requiredAreaForPath", () => {
  it("classifies specialist paths regardless of language prefix", () => {
    expect(requiredAreaForPath("/he/specialist/stories")).toBe("specialist");
    expect(requiredAreaForPath("/ar/specialist")).toBe("specialist");
    expect(requiredAreaForPath("/en/specialist/stories/new")).toBe("specialist");
  });

  it("classifies admin paths regardless of language prefix", () => {
    expect(requiredAreaForPath("/he/admin/overview")).toBe("admin");
    expect(requiredAreaForPath("/ar/admin")).toBe("admin");
  });

  it("returns null for public / caregiver routes", () => {
    expect(requiredAreaForPath("/he")).toBeNull();
    expect(requiredAreaForPath("/he/my-stories")).toBeNull();
    expect(requiredAreaForPath("/he/cart")).toBeNull();
    expect(requiredAreaForPath("/he/stories/abc/personalize")).toBeNull();
  });
});

describe("roleCanAccessArea", () => {
  it("lets anyone into public areas", () => {
    expect(roleCanAccessArea(null, undefined)).toBe(true);
    expect(roleCanAccessArea(null, "caregiver")).toBe(true);
  });

  it("restricts admin area to admins", () => {
    expect(roleCanAccessArea("admin", "admin")).toBe(true);
    expect(roleCanAccessArea("admin", "specialist")).toBe(false);
    expect(roleCanAccessArea("admin", "caregiver")).toBe(false);
    expect(roleCanAccessArea("admin", undefined)).toBe(false);
  });

  it("restricts specialist area to specialists and admins", () => {
    expect(roleCanAccessArea("specialist", "specialist")).toBe(true);
    expect(roleCanAccessArea("specialist", "admin")).toBe(true);
    expect(roleCanAccessArea("specialist", "caregiver")).toBe(false);
    expect(roleCanAccessArea("specialist", undefined)).toBe(false);
  });
});

describe("isPathAllowedForRole (returnTo / from authorization)", () => {
  it("blocks a caregiver from a specialist returnTo target", () => {
    expect(isPathAllowedForRole("/he/specialist/stories", "caregiver")).toBe(false);
  });

  it("allows a specialist into a specialist returnTo target", () => {
    expect(isPathAllowedForRole("/he/specialist/stories", "specialist")).toBe(true);
  });

  it("blocks a specialist from an admin returnTo target", () => {
    expect(isPathAllowedForRole("/he/admin/overview", "specialist")).toBe(false);
  });

  it("allows an admin everywhere", () => {
    expect(isPathAllowedForRole("/he/admin/overview", "admin")).toBe(true);
    expect(isPathAllowedForRole("/he/specialist/stories", "admin")).toBe(true);
  });

  it("always allows public destinations", () => {
    expect(isPathAllowedForRole("/he/my-stories", "caregiver")).toBe(true);
    expect(isPathAllowedForRole("/he", undefined)).toBe(true);
  });
});

describe("isSafeInternalPath", () => {
  it("accepts single-slash internal paths", () => {
    expect(isSafeInternalPath("/he/specialist")).toBe(true);
    expect(isSafeInternalPath("/he/my-stories?tab=previews")).toBe(true);
  });

  it("rejects external and malformed targets (open-redirect guard)", () => {
    expect(isSafeInternalPath("//evil.com")).toBe(false);
    expect(isSafeInternalPath("https://evil.com")).toBe(false);
    expect(isSafeInternalPath("evil.com")).toBe(false);
    expect(isSafeInternalPath(null)).toBe(false);
    expect(isSafeInternalPath(undefined)).toBe(false);
    expect(isSafeInternalPath(123 as unknown)).toBe(false);
  });
});
