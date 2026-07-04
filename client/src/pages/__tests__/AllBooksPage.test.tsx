import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AllBooksPage from "../AllBooksPage";
import { fetchStoriesWithFilters } from "../../api/stories";
import { useReferenceData } from "../../hooks/useReferenceData";
import { useLanguage } from "../../i18n/context/useLanguage";

jest.mock("../../api/stories", () => ({
  fetchStoriesWithFilters: jest.fn(),
}));
jest.mock("../../hooks/useReferenceData");
jest.mock("../../i18n/context/useLanguage");
jest.mock("../../i18n/useTranslation", () => ({
  useTranslation: () => (key: string, params?: Record<string, string | number>) =>
    key === "filters.removeAria" ? `remove ${params?.label ?? ""}` : key,
}));
jest.mock("../../components/SuggestStoryBanner", () => () => null);
jest.mock("../../components/StoryGridCard", () => (props: { story: { title: string } }) => (
  <div>{props.story.title}</div>
));

const mockFetchStoriesWithFilters =
  fetchStoriesWithFilters as jest.MockedFunction<typeof fetchStoriesWithFilters>;
const mockUseReferenceData = useReferenceData as jest.MockedFunction<typeof useReferenceData>;
const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>;

const referenceData = {
  topics: [
    {
      id: "fear_anxiety",
      active: true,
      order: 1,
      label_en: "Fear and anxiety",
      label_he: "פחד וחרדה",
      label_ar: "الخوف والقلق",
    },
  ],
  situations: [
    {
      id: "fear_of_swimming",
      topicKey: "fear_anxiety",
      active: true,
      label_en: "Fear of swimming",
      label_he: "פחד משחייה",
      label_ar: "الخوف من السباحة",
    },
  ],
};

function setLanguage(language: "he" | "ar" | "en") {
  mockUseLanguage.mockReturnValue({
    language,
    direction: language === "en" ? "ltr" : "rtl",
    isRTL: language !== "en",
    setLanguage: jest.fn(),
  });
}

function renderPage(language: "he" | "ar" | "en") {
  setLanguage(language);

  return render(
    <MemoryRouter initialEntries={[`/${language}/books`]}>
      <Routes>
        <Route path="/:lang/books" element={<AllBooksPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AllBooksPage localization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseReferenceData.mockReturnValue({
      data: referenceData,
      loading: false,
    });
    mockFetchStoriesWithFilters.mockResolvedValue([
      {
        id: "story-1",
        title: "Story One",
        primaryTopic: "fear_anxiety",
        topicKey: "fear_anxiety",
        situationId: "fear_of_swimming",
        ageGroup: "3_6",
      } as any,
    ]);
  });

  test.each([
    ["he", "פחד וחרדה", "פחד משחייה"],
    ["ar", "الخوف والقلق", "الخوف من السباحة"],
    ["en", "Fear and anxiety", "Fear of swimming"],
  ] as const)(
    "%s books filters display localized labels instead of raw ids",
    async (language, expectedTopicLabel, expectedSituationLabel) => {
      renderPage(language);

      await screen.findByText("Story One");

      await userEvent.click(screen.getByText("filters.allCategories"));
      await userEvent.click(screen.getByText(expectedTopicLabel));

      expect(screen.getAllByText(expectedTopicLabel).length).toBeGreaterThan(0);
      expect(screen.queryByText("fear_anxiety")).not.toBeInTheDocument();

      await userEvent.click(screen.getByText("filters.allTopics"));
      await userEvent.click(screen.getByText(expectedSituationLabel));

      expect(screen.getAllByText(expectedSituationLabel).length).toBeGreaterThan(0);
      expect(screen.queryByText("fear_of_swimming")).not.toBeInTheDocument();

      await userEvent.click(screen.getByLabelText(`remove ${expectedSituationLabel}`));
      await waitFor(() =>
        expect(screen.queryByLabelText(`remove ${expectedSituationLabel}`)).not.toBeInTheDocument(),
      );
    },
  );
});
