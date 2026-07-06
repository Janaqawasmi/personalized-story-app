import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PublishDialog from "../PublishDialog";
import { publishStoryToLibrary } from "../../../../api/illustrationApi";
import { fetchSituationsByTopic } from "../../../../api/referenceData";
import type { Story } from "../../../../types/story";

jest.mock("../../../../api/illustrationApi", () => ({
  publishStoryToLibrary: jest.fn(),
}));
jest.mock("../../../../api/referenceData", () => ({
  fetchSituationsByTopic: jest.fn(),
}));

const mockPublish = publishStoryToLibrary as jest.MockedFunction<typeof publishStoryToLibrary>;
const mockFetchSituations = fetchSituationsByTopic as jest.MockedFunction<typeof fetchSituationsByTopic>;

const CREATIVE_VISION = "A brave fox learns that the dark isn't so scary after all.";

function makeStory(): Story {
  return {
    id: "story-1",
    title: "The Brave Fox",
    storyType: "fear_anxiety",
    brief: {
      section2: { creativeVision: CREATIVE_VISION },
    },
  } as unknown as Story;
}

const SITUATIONS = [
  { id: "fear_of_dark", label_he: "פחד מהחושך", label_ar: "الخوف من الظلام", label_en: "Fear of the dark" },
];

async function openOtherSituation() {
  await userEvent.click(screen.getByLabelText("Situation"));
  const listbox = await screen.findByRole("listbox");
  await userEvent.click(within(listbox).getByText("Other — request new situation"));
}

async function selectExistingSituation() {
  await userEvent.click(screen.getByLabelText("Situation"));
  const listbox = await screen.findByRole("listbox");
  await userEvent.click(within(listbox).getByText("פחד מהחושך"));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchSituations.mockResolvedValue(SITUATIONS as never);
});

describe("PublishDialog — language tabs", () => {
  test("shows Hebrew, Arabic, and English as distinct tabs, defaulting to Hebrew", async () => {
    render(<PublishDialog open story={makeStory()} onClose={jest.fn()} onPublished={jest.fn()} />);

    expect(await screen.findByRole("tab", { name: /Hebrew/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Arabic/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /English/ })).toBeInTheDocument();

    // Hebrew short description is pre-filled from the brief's creative vision.
    expect(screen.getByLabelText("Short description")).toHaveValue(CREATIVE_VISION);
  });

  test("switching to the English tab shows its own (initially empty) fields", async () => {
    render(<PublishDialog open story={makeStory()} onClose={jest.fn()} onPublished={jest.fn()} />);
    await screen.findByRole("tab", { name: /Hebrew/ });

    await userEvent.click(screen.getByRole("tab", { name: /English/ }));

    expect(screen.getByRole("tab", { name: /English/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Short description")).toHaveValue("");
  });

  test("typing in a language's field updates only that language's value", async () => {
    render(<PublishDialog open story={makeStory()} onClose={jest.fn()} onPublished={jest.fn()} />);
    await userEvent.click(await screen.findByRole("tab", { name: /English/ }));

    await userEvent.type(screen.getByLabelText("Short description"), "A brave fox story.");

    await userEvent.click(screen.getByRole("tab", { name: /Hebrew/ }));
    expect(screen.getByLabelText("Short description")).toHaveValue(CREATIVE_VISION);
  });
});

describe("PublishDialog — public preview", () => {
  test("shows the fallback creative-vision text as the Hebrew preview description by default", async () => {
    render(<PublishDialog open story={makeStory()} onClose={jest.fn()} onPublished={jest.fn()} />);
    expect(await screen.findByText("How this will appear publicly")).toBeInTheDocument();
    const preview = screen.getByTestId("publish-public-preview");
    expect(within(preview).getByText(CREATIVE_VISION)).toBeInTheDocument();
  });

  test("shows a clear empty state for English (no fallback) until the specialist fills it in", async () => {
    render(<PublishDialog open story={makeStory()} onClose={jest.fn()} onPublished={jest.fn()} />);
    await userEvent.click(await screen.findByRole("tab", { name: /English/ }));

    const preview = screen.getByTestId("publish-public-preview");
    expect(
      within(preview).getByText("(No description will be shown for this language yet.)"),
    ).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Short description"), "A brave fox story.");
    expect(within(preview).getByText("A brave fox story.")).toBeInTheDocument();
  });
});

describe("PublishDialog — situation suggestion flow", () => {
  test("does not show the admin-review explanation until 'Other' is selected", async () => {
    render(<PublishDialog open story={makeStory()} onClose={jest.fn()} onPublished={jest.fn()} />);
    await waitFor(() => expect(mockFetchSituations).toHaveBeenCalled());

    expect(screen.queryByText(/pending request for/)).not.toBeInTheDocument();
  });

  test("shows the admin-review explanation and He/Ar/En label fields once 'Other' is selected", async () => {
    render(<PublishDialog open story={makeStory()} onClose={jest.fn()} onPublished={jest.fn()} />);
    await waitFor(() => expect(mockFetchSituations).toHaveBeenCalled());

    await openOtherSituation();

    expect(screen.getByText("New situation request")).toBeInTheDocument();
    expect(screen.getByText(/pending request for/)).toBeInTheDocument();
    expect(screen.getByLabelText("Label (Hebrew)")).toBeInTheDocument();
    expect(screen.getByLabelText("Label (Arabic)")).toBeInTheDocument();
    expect(screen.getByLabelText("Label (English)")).toBeInTheDocument();
  });

  test("disables Publish until at least one proposal label is entered for 'Other'", async () => {
    render(<PublishDialog open story={makeStory()} onClose={jest.fn()} onPublished={jest.fn()} />);
    await waitFor(() => expect(mockFetchSituations).toHaveBeenCalled());
    await openOtherSituation();

    expect(screen.getByRole("button", { name: /Publish/ })).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Label (English)"), "Fear of the dark");
    expect(screen.getByRole("button", { name: /Publish/ })).toBeEnabled();
  });
});

describe("PublishDialog — publish payload", () => {
  test("sends the expected payload for an existing situation, unchanged from before", async () => {
    mockPublish.mockResolvedValue({ templateId: "tmpl-1" });
    const onPublished = jest.fn();
    render(<PublishDialog open story={makeStory()} onClose={jest.fn()} onPublished={onPublished} />);
    await waitFor(() => expect(mockFetchSituations).toHaveBeenCalledWith("fear_anxiety"));

    await selectExistingSituation();
    await userEvent.click(await screen.findByRole("tab", { name: /English/ }));
    await userEvent.type(screen.getByLabelText("Short description"), "A brave fox story.");
    await userEvent.type(screen.getByLabelText("Display topic"), "Fear of the dark");

    await userEvent.click(screen.getByRole("button", { name: /Publish/ }));

    await waitFor(() => expect(mockPublish).toHaveBeenCalledTimes(1));
    expect(mockPublish).toHaveBeenCalledWith("story-1", {
      shortDescriptionHe: CREATIVE_VISION,
      shortDescriptionAr: CREATIVE_VISION,
      shortDescriptionEn: "A brave fox story.",
      displayTopicHe: undefined,
      displayTopicAr: undefined,
      displayTopicEn: "Fear of the dark",
      situationId: "fear_of_dark",
    });
    expect(onPublished).toHaveBeenCalledWith("tmpl-1");
  });

  test("sends a situationProposal instead of situationId when 'Other' is used", async () => {
    mockPublish.mockResolvedValue({ templateId: "tmpl-2" });
    render(<PublishDialog open story={makeStory()} onClose={jest.fn()} onPublished={jest.fn()} />);
    await waitFor(() => expect(mockFetchSituations).toHaveBeenCalled());

    await openOtherSituation();
    await userEvent.type(screen.getByLabelText("Label (Hebrew)"), "פחד מברווזים");
    await userEvent.type(screen.getByLabelText("Reason (optional)"), "Very specific fear.");

    await userEvent.click(screen.getByRole("button", { name: /Publish/ }));

    await waitFor(() => expect(mockPublish).toHaveBeenCalledTimes(1));
    const [, body] = mockPublish.mock.calls[0]!;
    expect(body.situationId).toBeUndefined();
    expect(body.situationProposal).toEqual({
      labelHe: "פחד מברווזים",
      labelAr: undefined,
      labelEn: undefined,
      reason: "Very specific fear.",
    });
  });

  test("shows an inline error and re-enables Publish when the API call fails", async () => {
    mockPublish.mockRejectedValue(new Error("Server exploded"));
    render(<PublishDialog open story={makeStory()} onClose={jest.fn()} onPublished={jest.fn()} />);
    await waitFor(() => expect(mockFetchSituations).toHaveBeenCalled());
    await selectExistingSituation();

    await userEvent.click(screen.getByRole("button", { name: /Publish/ }));

    expect(await screen.findByText("Server exploded")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Publish/ })).toBeEnabled();
  });
});
