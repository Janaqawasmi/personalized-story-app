import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import StoryCard from "../StoryCard";
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

function renderCard(story: Story) {
  return render(
    <MemoryRouter>
      <LanguageProvider initialLanguage="en">
        <StoryCard story={story} onArchive={jest.fn()} onRestore={jest.fn()} />
      </LanguageProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
  window.open = jest.fn();
});

describe("StoryCard — the narrow-screen replacement for the table row", () => {
  test("shows the same primary action as the table row for a given status", () => {
    renderCard(makeStory("awaiting_review"));
    expect(screen.getByRole("button", { name: "Start review" })).toBeInTheDocument();
  });

  test("published opens the public catalog in a new tab, same as the table row", async () => {
    renderCard(makeStory("published", { publishedTemplateId: "tmpl-9" }));
    await userEvent.click(screen.getByRole("button", { name: "View public page" }));
    expect(window.open).toHaveBeenCalledWith(
      "/he/stories/tmpl-9",
      "_blank",
      "noopener,noreferrer",
    );
  });

  test("clicking the card body navigates to the story workspace", async () => {
    renderCard(makeStory("in_review"));
    await userEvent.click(screen.getByText("The Brave Fox"));
    expect(mockNavigate).toHaveBeenCalledWith("/he/specialist/stories/story-1");
  });

  test("clicking the action button does not also fire the card's own navigation", async () => {
    renderCard(makeStory("in_review"));
    await userEvent.click(screen.getByRole("button", { name: "Continue review" }));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });
});
