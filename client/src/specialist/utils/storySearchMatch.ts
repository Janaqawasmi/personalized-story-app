// client/src/specialist/utils/storySearchMatch.ts
//
// Client-side story list search — used by the dashboard filter and DraftStore.listStories.

import type { Story } from "../../types/story";

/**
 * Returns whether `story` matches the specialist search box query.
 * Case-insensitive substring match on: title, tags, brief section2 population, brief section2 trigger.
 */
export function storyMatchesSearchQuery(story: Story, searchQuery: string): boolean {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return true;

  if (story.title.toLowerCase().includes(q)) return true;

  for (const tag of story.tags ?? []) {
    if (tag.toLowerCase().includes(q)) return true;
  }

  if (story.brief.section2?.population?.toLowerCase().includes(q)) return true;
  if (story.brief.section2?.trigger?.toLowerCase().includes(q)) return true;

  return false;
}
