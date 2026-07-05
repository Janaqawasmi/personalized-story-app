import { validateShippingDetails } from "../shippingValidation.service";

const VALID = {
  fullName: "Noa Cohen",
  phoneNumber: "050-1234567",
  city: "Tel Aviv",
  streetAddress: "Herzl 1",
};

describe("validateShippingDetails", () => {
  it("accepts a minimal valid submission with only required fields", () => {
    const result = validateShippingDetails(VALID);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.value).toEqual(VALID);
  });

  it("accepts optional fields when provided and valid", () => {
    const result = validateShippingDetails({
      ...VALID,
      email: "noa@example.com",
      buildingOrHouseNumber: "12",
      apartment: "4B",
      postalCode: "6120101",
      deliveryNotes: "Leave with doorman",
    });
    expect(result.valid).toBe(true);
    expect(result.value).toEqual({
      ...VALID,
      email: "noa@example.com",
      buildingOrHouseNumber: "12",
      apartment: "4B",
      postalCode: "6120101",
      deliveryNotes: "Leave with doorman",
    });
  });

  it("rejects null/undefined input entirely", () => {
    expect(validateShippingDetails(null).valid).toBe(false);
    expect(validateShippingDetails(undefined).valid).toBe(false);
  });

  it.each(["fullName", "phoneNumber", "city", "streetAddress"] as const)(
    "rejects a missing required field: %s",
    (field) => {
      const result = validateShippingDetails({ ...VALID, [field]: "" });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    },
  );

  it("treats a whitespace-only required field the same as missing", () => {
    const result = validateShippingDetails({ ...VALID, city: "   " });
    expect(result.valid).toBe(false);
  });

  it("ignores non-string field values (never trusts client typing)", () => {
    const result = validateShippingDetails({ ...VALID, fullName: 12345 as unknown as string });
    expect(result.valid).toBe(false);
  });

  it("rejects a phone number with no digits", () => {
    expect(validateShippingDetails({ ...VALID, phoneNumber: "abc" }).valid).toBe(false);
  });

  it("accepts a phone number with international prefix and separators", () => {
    expect(validateShippingDetails({ ...VALID, phoneNumber: "+972 50-123-4567" }).valid).toBe(true);
  });

  it("rejects an invalid email when provided", () => {
    expect(validateShippingDetails({ ...VALID, email: "not-an-email" }).valid).toBe(false);
  });

  it("does not require email at all", () => {
    const result = validateShippingDetails(VALID);
    expect(result.valid).toBe(true);
    expect(result.value?.email).toBeUndefined();
  });
});
