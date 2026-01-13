// src/components/MegaMenu/data.ts
import { AgeGroup } from "./types";

// Age groups - labels are translated in components using translation hook
export const AGE_GROUPS: AgeGroup[] = [
  { id: "0-3", label: "0–3" },
  { id: "3-6", label: "3–6" },
  { id: "6-9", label: "6–9" },
  { id: "9-12", label: "9–12" },
];

// Note: Categories and topics are now loaded from Firestore reference data
// See useReferenceData hook for dynamic category/topic loading
