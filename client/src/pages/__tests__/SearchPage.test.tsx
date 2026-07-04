import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SearchPage from "../SearchPage";
import { searchStories } from "../../api/api";

jest.mock("../../api/api", () => ({
  searchStories: jest.fn(),
}));
jest.mock("../../i18n/useTranslation", () => ({
  useTranslation: () => (key: string) => key,
}));
jest.mock("../../i18n/navigation", () => ({
  useLangNavigate: () => jest.fn(),
}));
jest.mock("../../i18n/context/useLanguage", () => ({
  useLanguage: () => ({ language: "en", direction: "ltr", isRTL: false, setLanguage: jest.fn() }),
}));
jest.mock("../../hooks/useFavorite", () => ({
  useFavorite: () => ({ isFavorite: false, toggle: jest.fn(), loading: false }),
}));

const mockSearchStories = searchStories as jest.MockedFunction<typeof searchStories>;

describe("SearchPage stability", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchStories.mockResolvedValue({
      results: [{ id: "story1", title: "Story One" }],
      matchedAgeGroup: null,
    });
  });

  test("fetches exactly once per query — no refetch/reload loop from unstable useTranslation identity", async () => {
    render(
      <MemoryRouter initialEntries={["/en/search?q=fear+of+the+dark"]}>
        <SearchPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("Story One")).toBeInTheDocument());
    expect(mockSearchStories).toHaveBeenCalledTimes(1);

    // Give any runaway effect loop a real chance to fire more fetches.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });

    expect(mockSearchStories).toHaveBeenCalledTimes(1);
  });

  test("does not throw / loop when there is no query", async () => {
    render(
      <MemoryRouter initialEntries={["/en/search"]}>
        <SearchPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("searchPage.enterQuery")).toBeInTheDocument();
    expect(mockSearchStories).not.toHaveBeenCalled();
  });
});
