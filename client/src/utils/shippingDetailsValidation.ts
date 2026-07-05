import type { ShippingDetails } from "../types/commerce";

export interface ShippingDetailsInput {
  fullName: string;
  phoneNumber: string;
  email?: string;
  city: string;
  streetAddress: string;
  buildingOrHouseNumber?: string;
  apartment?: string;
  postalCode?: string;
  deliveryNotes?: string;
}

/** Values are i18n keys under "pages.shipping.errors.*" so the form can translate them. */
export type ShippingDetailsFieldErrors = Partial<Record<keyof ShippingDetailsInput, string>>;

export interface ShippingDetailsValidationResult {
  valid: boolean;
  errors: ShippingDetailsFieldErrors;
  /** Trimmed, only present when valid. */
  value?: ShippingDetails;
}

const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Simple, non-exhaustive validation for the print-purchase contact/address
 * form — deliberately loose (no libphonenumber, no address-lookup API) per
 * "keep validation simple." Mirrored (not shared) on the server in
 * server/src/services/shippingValidation.service.ts, which is the actual
 * source of truth — this client copy only improves the form's UX.
 */
export function validateShippingDetails(
  input: Partial<ShippingDetailsInput>,
): ShippingDetailsValidationResult {
  const fullName = (input.fullName ?? "").trim();
  const phoneNumber = (input.phoneNumber ?? "").trim();
  const city = (input.city ?? "").trim();
  const streetAddress = (input.streetAddress ?? "").trim();
  const email = input.email?.trim();
  const buildingOrHouseNumber = input.buildingOrHouseNumber?.trim();
  const apartment = input.apartment?.trim();
  const postalCode = input.postalCode?.trim();
  const deliveryNotes = input.deliveryNotes?.trim();

  const errors: ShippingDetailsFieldErrors = {};
  if (!fullName) errors.fullName = "pages.shipping.errors.fullNameRequired";
  if (!phoneNumber) errors.phoneNumber = "pages.shipping.errors.phoneNumberRequired";
  else if (!PHONE_REGEX.test(phoneNumber)) errors.phoneNumber = "pages.shipping.errors.phoneNumberInvalid";
  if (!city) errors.city = "pages.shipping.errors.cityRequired";
  if (!streetAddress) errors.streetAddress = "pages.shipping.errors.streetAddressRequired";
  if (email && !EMAIL_REGEX.test(email)) errors.email = "pages.shipping.errors.emailInvalid";

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    value: {
      fullName,
      phoneNumber,
      city,
      streetAddress,
      ...(email ? { email } : {}),
      ...(buildingOrHouseNumber ? { buildingOrHouseNumber } : {}),
      ...(apartment ? { apartment } : {}),
      ...(postalCode ? { postalCode } : {}),
      ...(deliveryNotes ? { deliveryNotes } : {}),
    },
  };
}
