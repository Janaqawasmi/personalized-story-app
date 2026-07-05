import { ShippingDetails } from "../shared/types/commerce";

export interface ShippingDetailsValidationResult {
  valid: boolean;
  errors: string[];
  /** Trimmed, only present when valid. */
  value?: ShippingDetails;
}

const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Server-side source of truth for the print-purchase contact/address form.
 * The client has its own copy (client/src/utils/shippingDetailsValidation.ts)
 * for UX only — this is what actually gates whether a print cart item can be
 * created, since the client can never be trusted. Kept intentionally simple
 * ("keep validation simple") — no libphonenumber, no address-lookup API.
 */
export function validateShippingDetails(
  input: Record<string, unknown> | null | undefined,
): ShippingDetailsValidationResult {
  const fullName = str(input?.fullName);
  const phoneNumber = str(input?.phoneNumber);
  const city = str(input?.city);
  const streetAddress = str(input?.streetAddress);
  const email = str(input?.email);
  const buildingOrHouseNumber = str(input?.buildingOrHouseNumber);
  const apartment = str(input?.apartment);
  const postalCode = str(input?.postalCode);
  const deliveryNotes = str(input?.deliveryNotes);

  const errors: string[] = [];
  if (!fullName) errors.push("fullName is required");
  if (!phoneNumber) errors.push("phoneNumber is required");
  else if (!PHONE_REGEX.test(phoneNumber)) errors.push("phoneNumber is not a valid phone number");
  if (!city) errors.push("city is required");
  if (!streetAddress) errors.push("streetAddress is required");
  if (email && !EMAIL_REGEX.test(email)) errors.push("email is not a valid email address");

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
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
