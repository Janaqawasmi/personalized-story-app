// client/src/specialist/storage/index.ts
//
// Singleton selector — the one place that decides which DraftStore
// implementation the entire dashboard uses.

import { HybridDraftStore } from "./HybridDraftStore";
import type { DraftStore } from "./DraftStore";

const _store = new HybridDraftStore();

export const draftStore: DraftStore = _store;

/** Typed as HybridDraftStore so callers can read lastServerError. */
export const hybridStore: HybridDraftStore = _store;

export type { DraftStore } from "./DraftStore";
export type { ListStoriesFilter } from "./DraftStore";
