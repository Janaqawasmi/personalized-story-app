// Multi-draft local storage for the Story Brief form (browser-only; not synced across devices).

import { createEmptyBrief, type CompleteBrief, type StoryType } from "../types/storyBrief";

const LEGACY_KEY = "dammah_brief_draft_v1";
const REGISTRY_KEY = "dammah_brief_drafts_v2";

type RegistryV2 = {
  drafts: Record<string, CompleteBrief>;
};

function readRegistry(): RegistryV2 {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (!raw) return { drafts: {} };
    const parsed = JSON.parse(raw) as RegistryV2;
    if (!parsed.drafts || typeof parsed.drafts !== "object") return { drafts: {} };
    return parsed;
  } catch {
    return { drafts: {} };
  }
}

function writeRegistry(reg: RegistryV2): void {
  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(reg));
  } catch {
    // quota / private mode
  }
}

/**
 * Migrates the legacy single-slot key into a v2 registry once.
 */
function migrateLegacyIfNeeded(): void {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    const reg = readRegistry();
    if (Object.keys(reg.drafts).length > 0) {
      localStorage.removeItem(LEGACY_KEY);
      return;
    }
    const parsed = JSON.parse(raw) as CompleteBrief;
    const id = crypto.randomUUID();
    reg.drafts[id] = parsed;
    writeRegistry(reg);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    try {
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* ignore */
    }
  }
}

export function loadDraftForDraftId(draftId: string): CompleteBrief | null {
  migrateLegacyIfNeeded();
  const reg = readRegistry();
  return reg.drafts[draftId] ?? null;
}

export function saveDraftForDraftId(draftId: string, draft: CompleteBrief): void {
  migrateLegacyIfNeeded();
  const reg = readRegistry();
  reg.drafts[draftId] = draft;
  writeRegistry(reg);
}

export function deleteDraftForDraftId(draftId: string): void {
  migrateLegacyIfNeeded();
  const reg = readRegistry();
  delete reg.drafts[draftId];
  writeRegistry(reg);
}

export interface LocalDraftSummary {
  draftId: string;
  storyType: StoryType | null;
  savedAt: number | undefined;
}

export function listLocalDraftSummaries(): LocalDraftSummary[] {
  migrateLegacyIfNeeded();
  const reg = readRegistry();
  const rows = Object.entries(reg.drafts).map(([draftId, d]) => ({
    draftId,
    storyType: d.storyType ?? null,
    savedAt: d.savedAt,
  }));
  rows.sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
  return rows;
}

/** Newest `savedAt` first; drafts without `savedAt` sort last. */
export function getOrCreateMostRecentDraftId(): string {
  const summaries = listLocalDraftSummaries();
  if (summaries.length === 0) {
    const id = crypto.randomUUID();
    saveDraftForDraftId(id, createEmptyBrief());
    return id;
  }
  summaries.sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
  return summaries[0].draftId;
}

export function createNewDraftIdWithEmptyBrief(): string {
  const id = crypto.randomUUID();
  saveDraftForDraftId(id, createEmptyBrief());
  return id;
}
