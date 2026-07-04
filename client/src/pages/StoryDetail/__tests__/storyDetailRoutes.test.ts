import { getPersonalizeRoute } from "../storyDetailRoutes";

describe("getPersonalizeRoute", () => {
  it("builds the personalization wizard route for a given story id", () => {
    expect(getPersonalizeRoute("story-123")).toBe("/stories/story-123/personalize");
  });

  it("never resolves to a mailto/contact-email fallback (Bug 1 regression guard)", () => {
    const route = getPersonalizeRoute("any-story-id");
    expect(route.startsWith("mailto:")).toBe(false);
    expect(route).toMatch(/^\/stories\/.+\/personalize$/);
  });
});
