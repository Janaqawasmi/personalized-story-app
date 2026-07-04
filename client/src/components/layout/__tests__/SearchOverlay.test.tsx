import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchOverlay from "../SearchOverlay";
import { useReferenceData } from "../../../hooks/useReferenceData";
import { useLanguage } from "../../../i18n/context/useLanguage";

jest.mock("../../../hooks/useReferenceData");
jest.mock("../../../i18n/context/useLanguage");
jest.mock("../../../i18n/useTranslation", () => ({
  useTranslation: () => (key: string) => key,
}));
jest.mock("../../../i18n/navigation", () => ({
  useLangNavigate: () => jest.fn(),
}));
jest.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({ currentUser: null }),
}));

const mockGetDocs = jest.fn();
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  query: jest.fn(),
  where: jest.fn(),
}));
jest.mock("../../../firebase", () => ({ db: {} }));

const mockUseReferenceData = useReferenceData as jest.MockedFunction<typeof useReferenceData>;
const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>;

// All assertions below reference these fields directly rather than retyping
// Hebrew/Arabic text inline, so there is exactly one place the strings live.
const FEAR_OF_DARK = {
  id: "fear_of_dark",
  topicKey: "fear_anxiety",
  active: true,
  label_en: "Fear of the dark",
  label_he: "פחד מחושך",
  label_ar: "الخوف من الظلام",
};

/** Content-language-tagged fixtures — SearchOverlay also filters its story
 * cache by the story's own content language matching the UI language, so
 * each test's fixtures must be tagged with that test's language. */
function storiesForLanguage(language: "en" | "he" | "ar") {
  const storyA = {
    id: "storyA",
    title: "Story A",
    situationId: "fear_of_dark",
    specificSituation: "The child is afraid when the lights go out at night.",
    primaryTopic: "fear_anxiety",
    topicKey: "fear_anxiety",
    language,
    status: "approved",
  };
  // Different situationId, but its free-text `specificSituation` happens to
  // mention "dark" too — must NOT be picked up by the situation filter, since
  // filtering is by situationId, not by scanning specificSituation text.
  const storyB = {
    id: "storyB",
    title: "Story B",
    situationId: "fear_of_school",
    specificSituation: "Walking into a dark, unfamiliar classroom on the first day.",
    primaryTopic: "fear_anxiety",
    topicKey: "fear_anxiety",
    language,
    status: "approved",
  };
  return [storyA, storyB];
}

function mockFirestoreDocs(docs: Record<string, unknown>[]) {
  mockGetDocs.mockResolvedValue({
    docs: docs.map((d) => ({ id: d.id, data: () => d })),
  });
}

/** The same label text is expected to appear both on the suggestion chip and
 * in a popular-story caption — find specifically the chip element. */
async function findChip(text: string) {
  const matches = await screen.findAllByText(text);
  const chip = matches.find((el) => el.className.includes("MuiChip-label"));
  if (!chip) throw new Error(`No chip found with text "${text}"`);
  return chip;
}

function setLanguage(language: "en" | "he" | "ar") {
  mockUseLanguage.mockReturnValue({
    language,
    direction: language === "en" ? "ltr" : "rtl",
    isRTL: language !== "en",
    setLanguage: jest.fn(),
  });
  mockFirestoreDocs(storiesForLanguage(language));
}

describe("SearchOverlay localization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseReferenceData.mockReturnValue({
      data: { topics: [], situations: [FEAR_OF_DARK] },
      loading: false,
    });
  });

  test("English UI shows the English situation label as a suggestion chip", async () => {
    setLanguage("en");
    render(<SearchOverlay isOpen={true} onClose={jest.fn()} />);

    expect(await findChip(FEAR_OF_DARK.label_en)).toBeInTheDocument();
    expect(screen.queryByText(FEAR_OF_DARK.label_he)).not.toBeInTheDocument();
    expect(screen.queryByText(FEAR_OF_DARK.label_ar)).not.toBeInTheDocument();
  });

  test("Hebrew UI shows the Hebrew situation label as a suggestion chip", async () => {
    setLanguage("he");
    render(<SearchOverlay isOpen={true} onClose={jest.fn()} />);

    expect(await findChip(FEAR_OF_DARK.label_he)).toBeInTheDocument();
    expect(screen.queryByText(FEAR_OF_DARK.label_en)).not.toBeInTheDocument();
  });

  test("Arabic UI shows the Arabic situation label as a suggestion chip", async () => {
    setLanguage("ar");
    render(<SearchOverlay isOpen={true} onClose={jest.fn()} />);

    expect(await findChip(FEAR_OF_DARK.label_ar)).toBeInTheDocument();
    expect(screen.queryByText(FEAR_OF_DARK.label_he)).not.toBeInTheDocument();
    expect(screen.queryByText(FEAR_OF_DARK.label_en)).not.toBeInTheDocument();
  });

  test("changing language re-renders the same chip with the new language's label", async () => {
    setLanguage("en");
    const { rerender } = render(<SearchOverlay isOpen={true} onClose={jest.fn()} />);
    expect(await findChip(FEAR_OF_DARK.label_en)).toBeInTheDocument();

    setLanguage("ar");
    rerender(<SearchOverlay isOpen={true} onClose={jest.fn()} />);

    expect(await findChip(FEAR_OF_DARK.label_ar)).toBeInTheDocument();
    expect(screen.queryByText(FEAR_OF_DARK.label_en)).not.toBeInTheDocument();
  });

  test("typing the current-language situation label filters results by situationId, not by specificSituation text", async () => {
    setLanguage("en");
    render(<SearchOverlay isOpen={true} onClose={jest.fn()} />);

    const input = await screen.findByPlaceholderText("search.placeholder");
    await userEvent.type(input, FEAR_OF_DARK.label_en);

    await waitFor(() => expect(screen.getByText("Story A")).toBeInTheDocument());
    // Story B's specificSituation also mentions "dark", but its situationId is
    // different — it must not appear in the filtered results.
    expect(screen.queryByText("Story B")).not.toBeInTheDocument();
  });

  test("clicking the situation chip filters by situationId (chip.id), not by its translated label", async () => {
    setLanguage("he");
    render(<SearchOverlay isOpen={true} onClose={jest.fn()} />);

    const chip = await findChip(FEAR_OF_DARK.label_he);
    await userEvent.click(chip);

    await waitFor(() => expect(screen.getByText("Story A")).toBeInTheDocument());
    expect(screen.queryByText("Story B")).not.toBeInTheDocument();
  });

  test("popular stories and suggestion chips still appear under English/Arabic UI even when all content is authored in Hebrew", async () => {
    // Regression guard: SearchOverlay used to hard-filter its story cache by
    // `story.language === UI language`, so switching to English/Arabic hid
    // every story whenever content was authored in Hebrew (the common case).
    // The rest of the public catalog never filters by content language —
    // only display text is localized — so SearchOverlay must match that.
    mockUseLanguage.mockReturnValue({
      language: "en",
      direction: "ltr",
      isRTL: false,
      setLanguage: jest.fn(),
    });
    mockFirestoreDocs(storiesForLanguage("he"));

    render(<SearchOverlay isOpen={true} onClose={jest.fn()} />);

    expect(await screen.findByText("Story A")).toBeInTheDocument();
    expect(screen.getByText("Story B")).toBeInTheDocument();
    expect(await findChip(FEAR_OF_DARK.label_en)).toBeInTheDocument();
  });
});
