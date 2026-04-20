// client/src/specialist/storage/index.ts
//
// Singleton selector — the one place that decides which DraftStore
// implementation the entire dashboard uses.

import { HybridDraftStore } from "./HybridDraftStore";
import type { DraftStore } from "./DraftStore";

export const draftStore: DraftStore = new HybridDraftStore();

export type { DraftStore } from "./DraftStore";
export type { ListStoriesFilter } from "./DraftStore";
