import { render, screen } from "@testing-library/react";
import StoryGridCard from "../StoryGridCard";
import { useReferenceData } from "../../hooks/useReferenceData";
import { useLanguage } from "../../i18n/context/useLanguage";

jest.mock("../../hooks/useReferenceData");
jest.mock("../../i18n/context/useLanguage");
jest.mock("../../i18n/navigation", () => ({
  useLangNavigate: () => jest.fn(),
}));
jest.mock("../../i18n/useTranslation", () => ({
  useTranslation: () => (key: string) => key,
}));
jest.mock("../../hooks/useFavorite", () => ({
  useFavorite: () => ({ isFavorite: false, toggle: jest.fn(), loading: false }),
}));

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

describe("StoryGridCard localization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseReferenceData.mockReturnValue({
      data: referenceData,
      loading: false,
    });
  });

  test.each([
    ["he", "פחד משחייה"],
    ["ar", "الخوف من السباحة"],
    ["en", "Fear of swimming"],
  ] as const)(
    "shows the localized story badge in %s instead of the raw taxonomy id",
    (language, expectedLabel) => {
      mockUseLanguage.mockReturnValue({
        language,
        direction: language === "en" ? "ltr" : "rtl",
        isRTL: language !== "en",
        setLanguage: jest.fn(),
      });

      render(
        <StoryGridCard
          story={{
            id: "story-1",
            title: "Story One",
            shortDescription: "Short description",
            situationId: "fear_of_swimming",
            primaryTopic: "fear_anxiety",
            ageGroup: "3_6",
          }}
        />,
      );

      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
      expect(screen.queryByText("fear_of_swimming")).not.toBeInTheDocument();
      expect(screen.queryByText("fear_anxiety")).not.toBeInTheDocument();
    },
  );
});
