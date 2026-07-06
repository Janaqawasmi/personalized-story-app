import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TextVariantStatusIndicator from "../TextVariantStatusIndicator";
import { getTextVariants, type TextVariantsResponse } from "../../../api/specialistTemplatesApi";

jest.mock("../../../api/specialistTemplatesApi", () => ({
  getTextVariants: jest.fn(),
}));

jest.mock("../../../i18n/specialistDeskUi", () => {
  const { SPECIALIST_DESK_EN } = jest.requireActual("../../../i18n/specialistDeskLocales");
  return { useSpecialistDeskUi: () => SPECIALIST_DESK_EN };
});

const mockGetTextVariants = getTextVariants as jest.MockedFunction<typeof getTextVariants>;

function response(overrides: Partial<TextVariantsResponse> = {}): TextVariantsResponse {
  return {
    templateExists: true,
    textVariantStatus: "none",
    personalizationEnabled: true,
    textPersonalizationReady: false,
    variants: [],
    ...overrides,
  };
}

function renderIndicator(templateId: string | null) {
  return render(
    <MemoryRouter initialEntries={["/en/story"]}>
      <Routes>
        <Route path="/:lang/story" element={<TextVariantStatusIndicator templateId={templateId} />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("TextVariantStatusIndicator", () => {
  test("renders nothing when templateId is null (story not published yet)", () => {
    const { container } = renderIndicator(null);
    expect(container).toBeEmptyDOMElement();
    expect(mockGetTextVariants).not.toHaveBeenCalled();
  });

  test("shows 'not personalizable' without a review link for a non-personalizable story", async () => {
    mockGetTextVariants.mockResolvedValue(response({ personalizationEnabled: false }));

    renderIndicator("tmpl-1");

    expect(await screen.findByText("Not personalizable")).toBeInTheDocument();
    expect(screen.queryByText("Review variants")).not.toBeInTheDocument();
  });

  test("shows pending-review status with progress count and a review link when variants exist", async () => {
    mockGetTextVariants.mockResolvedValue(
      response({
        textVariantStatus: "pending_review",
        variants: [
          { pageNumber: 1, originalText: "a", masculine: "a", feminine: "a", reviewStatus: "approved", generatedAt: 1 },
          { pageNumber: 2, originalText: "b", masculine: "b", feminine: "b", reviewStatus: "approved", generatedAt: 1 },
          { pageNumber: 3, originalText: "c", masculine: "c", feminine: "c", reviewStatus: "pending", generatedAt: 1 },
        ],
      }),
    );

    renderIndicator("tmpl-1");

    expect(await screen.findByText("Text variants pending review")).toBeInTheDocument();
    expect(screen.getByText("2/3 pages reviewed")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Review variants" });
    expect(link).toHaveAttribute("href", "/en/specialist/templates/tmpl-1/text-variants");
  });

  test("shows 'personalization ready' once textPersonalizationReady is true, without a progress count", async () => {
    mockGetTextVariants.mockResolvedValue(response({ textPersonalizationReady: true }));

    renderIndicator("tmpl-1");

    expect(await screen.findByText("Personalization ready")).toBeInTheDocument();
    expect(screen.queryByText(/pages reviewed/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review variants" })).toBeInTheDocument();
  });

  test("shows 'personalization not started' when personalizable but nothing generated yet", async () => {
    mockGetTextVariants.mockResolvedValue(response());

    renderIndicator("tmpl-1");

    expect(await screen.findByText("Personalization not started")).toBeInTheDocument();
  });

  test("renders nothing while the status is still loading, then appears once resolved", async () => {
    let resolvePromise!: (value: TextVariantsResponse) => void;
    mockGetTextVariants.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );

    const { container } = renderIndicator("tmpl-1");
    expect(container).toBeEmptyDOMElement();

    resolvePromise(response({ textPersonalizationReady: true }));
    await waitFor(() => expect(screen.getByText("Personalization ready")).toBeInTheDocument());
  });
});
