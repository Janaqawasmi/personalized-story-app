import { isTransitionAllowed } from "@/models/story.model";

describe("ALLOWED_TRANSITIONS — v2 illustration edges", () => {
  test("approved → illustration_workspace is allowed", () => {
    expect(isTransitionAllowed("approved", "illustration_workspace")).toBe(true);
  });

  test("illustration_workspace → illustration_ready is allowed", () => {
    expect(
      isTransitionAllowed("illustration_workspace", "illustration_ready"),
    ).toBe(true);
  });

  test("illustration_workspace → in_review is allowed", () => {
    expect(isTransitionAllowed("illustration_workspace", "in_review")).toBe(
      true,
    );
  });

  test("illustration_workspace → archived is allowed", () => {
    expect(isTransitionAllowed("illustration_workspace", "archived")).toBe(
      true,
    );
  });

  test("illustration_ready → illustration_workspace is allowed", () => {
    expect(
      isTransitionAllowed("illustration_ready", "illustration_workspace"),
    ).toBe(true);
  });

  test("approved → illustration_ready is denied (must go through workspace)", () => {
    expect(isTransitionAllowed("approved", "illustration_ready")).toBe(false);
  });

  test("awaiting_review → illustration_workspace is denied", () => {
    expect(
      isTransitionAllowed("awaiting_review", "illustration_workspace"),
    ).toBe(false);
  });

  test("illustration_workspace → published is denied", () => {
    expect(isTransitionAllowed("illustration_workspace", "published")).toBe(
      false,
    );
  });

  test("in_review → illustration_workspace is denied", () => {
    expect(isTransitionAllowed("in_review", "illustration_workspace")).toBe(
      false,
    );
  });

  test("draft_brief → illustration_workspace is denied", () => {
    expect(isTransitionAllowed("draft_brief", "illustration_workspace")).toBe(
      false,
    );
  });
});
