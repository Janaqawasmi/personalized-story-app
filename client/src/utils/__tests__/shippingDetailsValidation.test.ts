import { validateShippingDetails } from "../shippingDetailsValidation";

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
    expect(result.errors).toEqual({});
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

  it("omits empty optional fields from the returned value", () => {
    const result = validateShippingDetails({ ...VALID, email: "", deliveryNotes: "   " });
    expect(result.valid).toBe(true);
    expect(result.value).toEqual(VALID);
  });

  it.each(["fullName", "phoneNumber", "city", "streetAddress"] as const)(
    "rejects a missing required field: %s",
    (field) => {
      const result = validateShippingDetails({ ...VALID, [field]: "" });
      expect(result.valid).toBe(false);
      expect(result.errors[field]).toBeTruthy();
    },
  );

  it("treats a whitespace-only required field the same as missing", () => {
    const result = validateShippingDetails({ ...VALID, city: "   " });
    expect(result.valid).toBe(false);
    expect(result.errors.city).toBe("pages.shipping.errors.cityRequired");
  });

  it("rejects a phone number with no digits", () => {
    const result = validateShippingDetails({ ...VALID, phoneNumber: "abc" });
    expect(result.valid).toBe(false);
    expect(result.errors.phoneNumber).toBe("pages.shipping.errors.phoneNumberInvalid");
  });

  it("rejects a phone number that is too short", () => {
    const result = validateShippingDetails({ ...VALID, phoneNumber: "123" });
    expect(result.valid).toBe(false);
    expect(result.errors.phoneNumber).toBe("pages.shipping.errors.phoneNumberInvalid");
  });

  it("accepts a phone number with international prefix and separators", () => {
    const result = validateShippingDetails({ ...VALID, phoneNumber: "+972 50-123-4567" });
    expect(result.valid).toBe(true);
  });

  it("rejects an invalid email when provided", () => {
    const result = validateShippingDetails({ ...VALID, email: "not-an-email" });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBe("pages.shipping.errors.emailInvalid");
  });

  it("does not require email at all", () => {
    const result = validateShippingDetails({ ...VALID, email: undefined });
    expect(result.valid).toBe(true);
    expect(result.value?.email).toBeUndefined();
  });

  it("reports all invalid fields at once", () => {
    const result = validateShippingDetails({});
    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors).sort()).toEqual(["city", "fullName", "phoneNumber", "streetAddress"]);
  });
});
