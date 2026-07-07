import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import StoriesFilterBar from "../StoriesFilterBar";
import { LanguageProvider } from "../../../i18n/context/LanguageContext";
import { ACTION_BUCKET_STATUSES } from "../../utils/actionBucket";
import type { Story, StoryStatus } from "../../../types/story";

function makeStory(id: string, status: StoryStatus): Story {
  return { id, status, title: `Story ${id}` } as unknown as Story;
}

const STORIES: Story[] = [
  makeStory("1", "draft_brief"),
  makeStory("2", "awaiting_review"),
  makeStory("3", "approved"),
  makeStory("4", "generating"),
  makeStory("5", "in_review"),
  makeStory("6", "illustration_ready"),
  makeStory("7", "published"),
  makeStory("8", "published"),
  makeStory("9", "archived"),
];

function renderBar(overrides?: Partial<React.ComponentProps<typeof StoriesFilterBar>>) {
  const onStatusChange = jest.fn();
  const onSearchChange = jest.fn();
  const onSortChange = jest.fn();
  render(
    <LanguageProvider initialLanguage="en">
      <StoriesFilterBar
        allStories={STORIES}
        activeStatuses={[]}
        onStatusChange={onStatusChange}
        searchQuery=""
        onSearchChange={onSearchChange}
        sortBy="lastOpenedAt"
        sortDir="desc"
        onSortChange={onSortChange}
        {...overrides}
      />
    </LanguageProvider>,
  );
  return { onStatusChange, onSearchChange, onSortChange };
}

describe("StoriesFilterBar — primary bucket nav", () => {
  test("bucket counts never contradict each other (regression for the approved/published mismatch)", () => {
    renderBar();
    // needs_action = draft_brief, awaiting_review, approved = 3
    expect(screen.getByText("Needs action 3")).toBeInTheDocument();
    // in_progress = generating, in_review = 2
    expect(screen.getByText("In progress 2")).toBeInTheDocument();
    // ready_to_publish = illustration_ready = 1
    expect(screen.getByText("Ready to publish 1")).toBeInTheDocument();
    // published = 2
    expect(screen.getByText("Published 2")).toBeInTheDocument();
    // all excludes archived = 8
    expect(screen.getByText("All 8")).toBeInTheDocument();
  });

  test("clicking a bucket pill selects every status in that bucket", async () => {
    const { onStatusChange } = renderBar();
    await userEvent.click(screen.getByText("Needs action 3"));
    expect(onStatusChange).toHaveBeenCalledWith(
      ACTION_BUCKET_STATUSES.needs_action,
    );
  });

  test("clicking All clears the filter", async () => {
    const { onStatusChange } = renderBar({
      activeStatuses: ACTION_BUCKET_STATUSES.published,
    });
    await userEvent.click(screen.getByText("All 8"));
    expect(onStatusChange).toHaveBeenCalledWith([]);
  });
});

describe("StoriesFilterBar — search", () => {
  test("uses a short placeholder that won't get cut off", () => {
    renderBar();
    expect(
      screen.getByPlaceholderText("Search by title, topic, age"),
    ).toBeInTheDocument();
  });
});

describe("StoriesFilterBar — secondary detailed chips", () => {
  test("are collapsed by default and reveal on 'More filters'", async () => {
    renderBar();
    expect(screen.queryByText(/^Approved \d/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByText("More filters"));
    expect(screen.getByText("Approved 1")).toBeInTheDocument();
  });

  test("toggling a secondary chip only adds/removes that single status", async () => {
    const { onStatusChange } = renderBar();
    await userEvent.click(screen.getByText("More filters"));
    await userEvent.click(screen.getByText("Approved 1"));
    expect(onStatusChange).toHaveBeenCalledWith(["approved"]);
  });
});
