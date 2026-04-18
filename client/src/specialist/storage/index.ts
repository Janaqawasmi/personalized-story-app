// client/src/specialist/storage/index.ts
//
// Singleton selector — the one place that decides which DraftStore
// implementation the entire dashboard uses.
//
// TODO D1.4b: Replace this placeholder with HybridDraftStore:
//   import { HybridDraftStore } from './HybridDraftStore';
//   export const draftStore: DraftStore = new HybridDraftStore();

export type { DraftStore } from "./DraftStore";
export type { ListStoriesFilter } from "./DraftStore";
