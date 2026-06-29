// src/components/MegaMenu/data.ts
import { AgeGroup } from "./types";

// Age groups - MUST match the Specialist Dashboard story brief age ranges
// (AGE_RANGES in server/src/models/storyBrief.model.ts). Stories are published
// with their exact brief ageRange, so these ids must line up 1:1.
export const AGE_GROUPS: AgeGroup[] = [
  { id: "3-5", label: "3–5" },
  { id: "5-7", label: "5–7" },
  { id: "7-9", label: "7–9" },
  { id: "9-12", label: "9–12" },
];

// Note: Categories and topics are now loaded from Firestore reference data
// See useReferenceData hook for dynamic category/topic loading
