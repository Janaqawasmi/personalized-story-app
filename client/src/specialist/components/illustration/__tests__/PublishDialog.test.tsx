import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PublishDialog from "../PublishDialog";
import { publishStoryToLibrary } from "../../../../api/illustrationApi";
import { fetchSituationsByTopic } from "../../../../api/referenceData";
import { LanguageProvider } from "../../../../i18n/context/LanguageContext";
import type { Language } from "../../../../i18n/context/LanguageContext";
import type { Story } from "../../../../types/story";

jest.mock("../../../../api/illustrationApi", () => ({
  publishStoryToLibrary: jest.fn(),
}));
jest.mock("../../../../api/referenceData", () => ({
  fetchSituationsByTopic: jest.fn(),
}));

const mockPublish = publishStoryToLibrary as jest.MockedFunction<typeof publishStoryToLibrary>;
const mockFetchSituations = fetchSituationsByTopic as jest.MockedFunction<typeof fetchSituationsByTopic>;

function makeStory(): Story {
  return {
    id: "story-1",
    title: "The Brave Fox",
    storyType: "fear_anxiety",
    brief: {
      briefLanguage: "he",
      section1: { ageRange: "5-7" },
      section2: { creativeVision: "A brave fox learns that the dark isn't so scary after all." },
    },
  } as unknown as Story;
}

const SITUATIONS = [
  { id: "fear_of_dark", label_he: "פחד מהחושך", label_ar: "الخوف من الظلام", label_en: "Fear of the dark" },
];

function renderDialog(
  { dashboardLanguage = "en" as Language, story = makeStory(), onPublished = jest.fn(), onClose = jest.fn() } = {},
) {
  render(
    <LanguageProvider initialLanguage={dashboardLanguage}>
      <PublishDialog open story={story} onClose={onClose} onPublished={onPublished} />
    </LanguageProvider>,
  );
}

async function openOtherSituation() {
  await userEvent.click(screen.getByLabelText("Situation"));
  const listbox = await screen.findByRole("listbox");
  await userEvent.click(within(listbox).getByText("Other — request new situation"));
}

async function selectExistingSituation() {
  await userEvent.click(screen.getByLabelText("Situation"));
  const listbox = await screen.findByRole("listbox");
  await userEvent.click(within(listbox).getByText("Fear of the dark"));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchSituations.mockResolvedValue(SITUATIONS as never);
});

describe("PublishDialog — header", () => {
  test("shows the clearer publish header and subtitle", async () => {
    renderDialog();
    expect(await screen.findByText("Publish story to public library")).toBeInTheDocument();
    expect(screen.getByText("Review how this story will appear to parents before publishing.")).toBeInTheDocument();
  });
});

describe("PublishDialog — no decorative extras", () => {
  test("does not show an auto-filled badge, a character counter, or a public preview card", async () => {
    renderDialog();
    await waitFor(() => expect(mockFetchSituations).toHaveBeenCalled());

    expect(screen.queryByText(/Auto-filled/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/characters/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("publish-public-preview")).not.toBeInTheDocument();
    expect(screen.queryByText(/appears on story cards/i)).not.toBeInTheDocument();
  });

  test("does not render a topic override / display topic field anywhere", async () => {
    renderDialog();
    await waitFor(() => expect(mockFetchSituations).toHaveBeenCalled());

    expect(screen.queryByLabelText("Display topic")).not.toBeInTheDocument();
    expect(screen.queryByText(/topic override/i)).not.toBeInTheDocument();
  });
});

describe("PublishDialog — description language tabs, no auto-fill", () => {
  test("shows Hebrew, Arabic, and English as equal tabs, all starting blank", async () => {
    renderDialog();

    expect(await screen.findByRole("tab", { name: "Hebrew" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Arabic" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "English" })).toBeInTheDocument();
    expect(screen.getByLabelText("Short description")).toHaveValue("");
  });

  test("defaults to the tab matching the current dashboard language", async () => {
    renderDialog({ dashboardLanguage: "ar" });

    // Tab labels are localized too — with an Arabic dashboard, the Arabic-language
    // tab is labeled "العربية" (Arabic), not the English word "Arabic".
    expect(await screen.findByRole("tab", { name: "العربية" })).toHaveAttribute("aria-selected", "true");
  });

  test("switching tabs never pre-fills text from the brief's creative vision", async () => {
    renderDialog();
    await screen.findByRole("tab", { name: "Hebrew" });

    for (const lang of ["Hebrew", "Arabic", "English"]) {
      await userEvent.click(screen.getByRole("tab", { name: lang }));
      expect(screen.getByLabelText("Short description")).toHaveValue("");
    }
  });

  test("typing in one language's tab does not leak into another language's tab", async () => {
    renderDialog();
    // Default dashboard language is English, so English is the initially active tab —
    // switch to Hebrew explicitly before typing.
    await userEvent.click(await screen.findByRole("tab", { name: "Hebrew" }));

    await userEvent.type(screen.getByLabelText("Short description"), "טקסט בעברית");
    await userEvent.click(screen.getByRole("tab", { name: "English" }));
    expect(screen.getByLabelText("Short description")).toHaveValue("");

    await userEvent.click(screen.getByRole("tab", { name: "Hebrew" }));
    expect(screen.getByLabelText("Short description")).toHaveValue("טקסט בעברית");
  });
});

describe("PublishDialog — situation dropdown respects the active dashboard language", () => {
  test("shows English situation labels when the dashboard language is English", async () => {
    renderDialog({ dashboardLanguage: "en" });
    await waitFor(() => expect(mockFetchSituations).toHaveBeenCalled());

    await userEvent.click(screen.getByLabelText("Situation"));
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByText("Fear of the dark")).toBeInTheDocument();
    expect(within(listbox).queryByText("פחד מהחושך")).not.toBeInTheDocument();
  });

  test("shows Hebrew situation labels when the dashboard language is Hebrew", async () => {
    renderDialog({ dashboardLanguage: "he" });
    await waitFor(() => expect(mockFetchSituations).toHaveBeenCalled());

    // The "Situation" field label is itself localized ("מצב" in Hebrew).
    await userEvent.click(screen.getByLabelText("מצב"));
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByText("פחד מהחושך")).toBeInTheDocument();
  });

  test("shows Arabic situation labels when the dashboard language is Arabic", async () => {
    renderDialog({ dashboardLanguage: "ar" });
    await waitFor(() => expect(mockFetchSituations).toHaveBeenCalled());

    // The "Situation" field label is itself localized ("الحالة" in Arabic).
    await userEvent.click(screen.getByLabelText("الحالة"));
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByText("الخوف من الظلام")).toBeInTheDocument();
  });
});

describe("PublishDialog — publishing checklist", () => {
  test("description row is Missing until any language tab has text, Situation is Required until chosen", async () => {
    renderDialog();
    await waitFor(() => expect(mockFetchSituations).toHaveBeenCalled());

    expect(within(screen.getByTestId("publish-checklist-row-0")).getByText("Missing")).toBeInTheDocument();
    expect(within(screen.getByTestId("publish-checklist-row-1")).getByText("Required")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Short description"), "Some text");
    expect(within(screen.getByTestId("publish-checklist-row-0")).getByText("Complete")).toBeInTheDocument();

    await selectExistingSituation();
    expect(within(screen.getByTestId("publish-checklist-row-1")).getByText("Complete")).toBeInTheDocument();
  });
});

describe("PublishDialog — disabled Publish button explanation", () => {
  test("footer explains what's missing when Situation is not chosen, and Publish is disabled", async () => {
    renderDialog();
    await waitFor(() => expect(mockFetchSituations).toHaveBeenCalled());

    expect(screen.getByTestId("publish-footer-status")).toHaveTextContent("Missing: Catalog situation");
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
  });

  test("footer shows 'Ready to publish' and Publish is enabled once Situation is chosen", async () => {
    renderDialog();
    await waitFor(() => expect(mockFetchSituations).toHaveBeenCalled());
    await selectExistingSituation();

    expect(screen.getByTestId("publish-footer-status")).toHaveTextContent("Ready to publish");
    expect(screen.getByRole("button", { name: "Publish" })).toBeEnabled();
  });
});

describe("PublishDialog — situation suggestion flow", () => {
  test("does not show the admin-review explanation until 'Other' is selected", async () => {
    renderDialog();
    await waitFor(() => expect(mockFetchSituations).toHaveBeenCalled());

    expect(screen.queryByText(/pending request for/)).not.toBeInTheDocument();
  });

  test("shows the admin-review explanation and He/Ar/En label fields once 'Other' is selected", async () => {
    renderDialog();
    await waitFor(() => expect(mockFetchSituations).toHaveBeenCalled());

    await openOtherSituation();

    expect(screen.getByText("New situation request")).toBeInTheDocument();
    expect(screen.getByText(/pending request for/)).toBeInTheDocument();
    expect(screen.getByLabelText("Label (Hebrew)")).toBeInTheDocument();
    expect(screen.getByLabelText("Label (Arabic)")).toBeInTheDocument();
    expect(screen.getByLabelText("Label (English)")).toBeInTheDocument();
  });

  test("disables Publish until at least one proposal label is entered for 'Other'", async () => {
    renderDialog();
    await waitFor(() => expect(mockFetchSituations).toHaveBeenCalled());
    await openOtherSituation();

    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Label (English)"), "Fear of the dark");
    expect(screen.getByRole("button", { name: "Publish" })).toBeEnabled();
  });
});

describe("PublishDialog — publish payload", () => {
  test("sends only the languages the specialist actually typed (no auto-fill, no displayTopic keys)", async () => {
    mockPublish.mockResolvedValue({ templateId: "tmpl-1" });
    const onPublished = jest.fn();
    renderDialog({ onPublished });
    await waitFor(() => expect(mockFetchSituations).toHaveBeenCalledWith("fear_anxiety"));

    await userEvent.type(screen.getByLabelText("Short description"), "A brave fox story.");
    await selectExistingSituation();

    await userEvent.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(mockPublish).toHaveBeenCalledTimes(1));
    expect(mockPublish).toHaveBeenCalledWith("story-1", {
      shortDescriptionHe: undefined,
      shortDescriptionAr: undefined,
      shortDescriptionEn: "A brave fox story.",
      situationId: "fear_of_dark",
    });
    expect(onPublished).toHaveBeenCalledWith("tmpl-1");
  });

  test("sends a situationProposal instead of situationId when 'Other' is used", async () => {
    mockPublish.mockResolvedValue({ templateId: "tmpl-2" });
    renderDialog();
    await waitFor(() => expect(mockFetchSituations).toHaveBeenCalled());

    await openOtherSituation();
    await userEvent.type(screen.getByLabelText("Label (Hebrew)"), "פחד מברווזים");
    await userEvent.type(screen.getByLabelText("Reason (optional)"), "Very specific fear.");

    await userEvent.click(screen.getByRole("button", { name: "Publish" }));

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
    renderDialog();
    await waitFor(() => expect(mockFetchSituations).toHaveBeenCalled());
    await selectExistingSituation();

    await userEvent.click(screen.getByRole("button", { name: "Publish" }));

    expect(await screen.findByText("Server exploded")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish" })).toBeEnabled();
  });
});
