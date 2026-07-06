import { resolveCaregiverDisplayName } from "../caregiverDisplayName";

describe("resolveCaregiverDisplayName", () => {
  it("prefers fullName (legacy signup field)", () => {
    expect(resolveCaregiverDisplayName({ fullName: "Shahd Abidat", displayName: "Other" })).toBe(
      "Shahd Abidat",
    );
  });

  it("falls back to displayName when fullName is missing", () => {
    expect(resolveCaregiverDisplayName({ fullName: "Shahd Abidat" })).toBe("Shahd Abidat");
  });

  it("returns null when neither field is set", () => {
    expect(resolveCaregiverDisplayName({ email: "a@b.com" })).toBeNull();
    expect(resolveCaregiverDisplayName(null)).toBeNull();
  });

  it("trims whitespace", () => {
    expect(resolveCaregiverDisplayName({ fullName: "  Shahd Abidat  " })).toBe("Shahd Abidat");
  });
});
