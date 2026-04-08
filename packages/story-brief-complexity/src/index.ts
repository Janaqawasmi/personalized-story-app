/**
 * @dammah/story-brief-complexity — shared Section 16 engine (spec v1.3).
 * Pure functions; use thin adapters on client (`CompleteBrief`) and server (`StoryBrief`).
 */

export * from "./types";
export * from "./constants";
export { computeComplexityFromParts, roundToHalf } from "./engine";
export {
  extractComplexityPartsFromClientWire,
  isClientWireBriefPayload,
} from "./clientWireAdapter";
