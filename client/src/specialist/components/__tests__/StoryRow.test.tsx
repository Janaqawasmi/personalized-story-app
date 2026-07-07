import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import StoryRow from "../StoryRow";
import { LanguageProvider } from "../../../i18n/context/LanguageContext";
import type { Story, StoryStatus } from "../../../types/story";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

function makeStory(status: StoryStatus, overrides: Partial<Story> = {}): Story {
  return {
    id: "story-1",
    ownerUid: "u1",
    parentStoryId: null,
    title: "The Brave Fox",
    storyType: "fear_anxiety",
    ageRange: "5-7",
    tags: [],
    status,
    briefStatus: "submitted",
    editHistory: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastOpenedAt: Date.now(),
    submittedAt: null,
    approvedAt: null,
    publishedTemplateId: null,
    publishedAt: null,
    ...overrides,
  } as unknown as Story;
}

function renderRow(story: Story) {
  return render(
    <MemoryRouter>
      <LanguageProvider initialLanguage="en">
        <table>
          <tbody>
            <StoryRow
              story={story}
              onArchive={jest.fn()}
              onRestore={jest.fn()}
            />
          </tbody>
        </table>
      </LanguageProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
  window.open = jest.fn();
});

describe("StoryRow — action column", () => {
  test.each([
    ["draft_brief", "Continue brief"],
    ["generating", "View progress"],
    ["awaiting_review", "Start review"],
    ["in_review", "Continue review"],
    ["needs_revision", "View progress"],
    ["approved", "Start illustrations"],
    ["illustration_workspace", "Continue illustrations"],
    ["illustration_ready", "Review illustrations"],
    ["archived", "View details"],
  ] as [StoryStatus, string][])(
    "shows '%s' as the primary action for status %s",
    (status, label) => {
      renderRow(makeStory(status));
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    },
  );

  test("published shows 'View public page' and opens the public catalog in a new tab", async () => {
    renderRow(makeStory("published", { publishedTemplateId: "tmpl-9" }));
    const button = screen.getByRole("button", { name: "View public page" });
    await userEvent.click(button);
    expect(window.open).toHaveBeenCalledWith(
      "/he/stories/tmpl-9",
      "_blank",
      "noopener,noreferrer",
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("non-published action buttons navigate within the specialist workspace", async () => {
    renderRow(makeStory("awaiting_review"));
    await userEvent.click(screen.getByRole("button", { name: "Start review" }));
    expect(mockNavigate).toHaveBeenCalledWith("/he/specialist/stories/story-1");
  });

  test("clicking the action button does not also trigger the row's own navigation", async () => {
    renderRow(makeStory("awaiting_review"));
    await userEvent.click(screen.getByRole("button", { name: "Start review" }));
    // Only the button's own click handler should have called navigate once —
    // not once from the button and once from the row's onClick bubbling up.
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });
});

describe("StoryRow — overflow fix", () => {
  test("no longer renders a row-number column (freed width for Action)", () => {
    renderRow(makeStory("draft_brief"));
    // The old roman-numeral index cell ("i.", "ii.", …) and the "№" header
    // text are both gone now that the column has been removed.
    expect(screen.queryByText("i.")).not.toBeInTheDocument();
    expect(screen.queryByText("№")).not.toBeInTheDocument();
  });

  test("a very long title still renders as a single truncatable node, not a layout break", () => {
    const longTitle =
      "A Very Long Story Title That Would Otherwise Force The Table Wider Than Its Container And Cause Horizontal Overflow";
    renderRow(makeStory("draft_brief", { title: longTitle }));
    const link = screen.getByRole("link", { name: longTitle });
    expect(link).toBeInTheDocument();
    expect(link).toHaveStyle({ whiteSpace: "nowrap", textOverflow: "ellipsis" });
  });
});
