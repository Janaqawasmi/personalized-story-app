import { getRowActionLabel, getRowActionTarget } from "../rowAction";
import { STORY_STATUSES, type StoryStatus } from "../../../types/story";
import { SPECIALIST_DESK_EN } from "../../../i18n/specialistDeskLocales";

describe("getRowActionLabel", () => {
  test("every status resolves to a non-empty label", () => {
    for (const status of STORY_STATUSES) {
      const label = getRowActionLabel(status, SPECIALIST_DESK_EN);
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    }
  });

  test("needs_revision reads 'View progress', not a fix/edit verb", () => {
    // By the time a story is needs_revision, feedback was already submitted
    // and Agent 1 regeneration is already under way — the specialist has
    // nothing left to fix, only progress to watch.
    expect(getRowActionLabel("needs_revision", SPECIALIST_DESK_EN)).toBe(
      "View progress",
    );
    expect(getRowActionLabel("generating", SPECIALIST_DESK_EN)).toBe(
      "View progress",
    );
  });

  test("distinguishes starting vs. continuing a step", () => {
    expect(getRowActionLabel("awaiting_review", SPECIALIST_DESK_EN)).toBe(
      "Start review",
    );
    expect(getRowActionLabel("in_review", SPECIALIST_DESK_EN)).toBe(
      "Continue review",
    );
    expect(getRowActionLabel("approved", SPECIALIST_DESK_EN)).toBe(
      "Start illustrations",
    );
    expect(
      getRowActionLabel("illustration_workspace", SPECIALIST_DESK_EN),
    ).toBe("Continue illustrations");
  });

  test("published gets the public-page action", () => {
    expect(getRowActionLabel("published", SPECIALIST_DESK_EN)).toBe(
      "View public page",
    );
  });
});

describe("getRowActionTarget", () => {
  const base = { id: "story-1", publishedTemplateId: null as string | null };

  test("non-published statuses route to the internal specialist workspace", () => {
    const statuses: StoryStatus[] = STORY_STATUSES.filter(
      (s) => s !== "published",
    );
    for (const status of statuses) {
      const target = getRowActionTarget({ ...base, status }, "he");
      expect(target.external).toBe(false);
      expect(target.href).toBe("/he/specialist/stories/story-1");
    }
  });

  test("published with a templateId routes externally to the public catalog", () => {
    const target = getRowActionTarget(
      { ...base, status: "published", publishedTemplateId: "tmpl-42" },
      "he",
    );
    expect(target.external).toBe(true);
    expect(target.href).toBe("/he/stories/tmpl-42");
  });

  test("published without a templateId falls back to the internal workspace", () => {
    const target = getRowActionTarget(
      { ...base, status: "published", publishedTemplateId: null },
      "he",
    );
    expect(target.external).toBe(false);
    expect(target.href).toBe("/he/specialist/stories/story-1");
  });
});
