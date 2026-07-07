import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import StoriesTable from "../StoriesTable";
import { LanguageProvider } from "../../../i18n/context/LanguageContext";
import type { Story } from "../../../types/story";

function makeStory(id: string): Story {
  return {
    id,
    ownerUid: "u1",
    parentStoryId: null,
    title: `Story ${id}`,
    storyType: "fear_anxiety",
    ageRange: "5-7",
    tags: [],
    status: "draft_brief",
    briefStatus: "draft",
    editHistory: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastOpenedAt: Date.now(),
    submittedAt: null,
    approvedAt: null,
    publishedTemplateId: null,
    publishedAt: null,
  } as unknown as Story;
}

function renderTable(stories: Story[]) {
  return render(
    <MemoryRouter>
      <LanguageProvider initialLanguage="en">
        <StoriesTable
          stories={stories}
          loading={false}
          hasAnyStories={stories.length > 0}
          onArchive={jest.fn()}
          onRestore={jest.fn()}
          footerLeft="Showing 1–1 of 1 active manuscript"
          archivedCount={0}
        />
      </LanguageProvider>
    </MemoryRouter>,
  );
}

describe("StoriesTable — responsive layout", () => {
  test("renders both the desktop table and the mobile card list (CSS decides which is visible)", () => {
    renderTable([makeStory("1")]);
    // Both layouts render the same story; visibility between them is a pure
    // CSS display:none/block toggle at the "md" breakpoint, not a remount —
    // so both branches must exist in the DOM at once.
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByText("Story 1").length).toBeGreaterThanOrEqual(2);
  });

  test("table header no longer has a row-number column", () => {
    renderTable([makeStory("1")]);
    expect(screen.queryByText("№")).not.toBeInTheDocument();
  });

  test("table header shows the renamed columns", () => {
    renderTable([makeStory("1")]);
    expect(screen.getByText("Story")).toBeInTheDocument();
    expect(screen.getByText("Progress")).toBeInTheDocument();
    expect(screen.getByText("Topic & age")).toBeInTheDocument();
    expect(screen.getByText("Last update")).toBeInTheDocument();
    expect(screen.getByText("Action")).toBeInTheDocument();
  });
});
