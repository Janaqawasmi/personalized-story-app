import { act, render, screen, waitFor } from "@testing-library/react";
import TextVariantStatusIndicator from "../TextVariantStatusIndicator";
import { getTextVariants, generateTextVariants, type TextVariantsResponse } from "../../../api/specialistTemplatesApi";

jest.mock("../../../api/specialistTemplatesApi", () => ({
  getTextVariants: jest.fn(),
  generateTextVariants: jest.fn(),
}));

jest.mock("../../../i18n/specialistDeskUi", () => {
  const { SPECIALIST_DESK_EN } = jest.requireActual("../../../i18n/specialistDeskLocales");
  return { useSpecialistDeskUi: () => SPECIALIST_DESK_EN };
});

const mockGetTextVariants = getTextVariants as jest.MockedFunction<typeof getTextVariants>;
const mockGenerateTextVariants = generateTextVariants as jest.MockedFunction<typeof generateTextVariants>;

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

beforeEach(() => {
  jest.clearAllMocks();
});

describe("TextVariantStatusIndicator", () => {
  test("renders nothing when templateId is null (story not published yet)", () => {
    const { container } = render(<TextVariantStatusIndicator templateId={null} />);
    expect(container).toBeEmptyDOMElement();
    expect(mockGetTextVariants).not.toHaveBeenCalled();
  });

  test("shows 'not personalizable' with no generate action for a non-personalizable story", async () => {
    mockGetTextVariants.mockResolvedValue(response({ personalizationEnabled: false }));

    render(<TextVariantStatusIndicator templateId="tmpl-1" />);

    expect(await screen.findByText("Not personalizable")).toBeInTheDocument();
    expect(screen.queryByText("Generate")).not.toBeInTheDocument();
  });

  test("shows 'personalization ready' once textPersonalizationReady is true, with no generate action", async () => {
    mockGetTextVariants.mockResolvedValue(response({ textPersonalizationReady: true }));

    render(<TextVariantStatusIndicator templateId="tmpl-1" />);

    expect(await screen.findByText("Personalization ready")).toBeInTheDocument();
    expect(screen.queryByText("Generate")).not.toBeInTheDocument();
  });

  test("shows 'generating' while a generation call is in flight, with no generate action", async () => {
    mockGetTextVariants.mockResolvedValue(response({ textVariantStatus: "generating" }));

    render(<TextVariantStatusIndicator templateId="tmpl-1" />);

    expect(await screen.findByText("Generating variants…")).toBeInTheDocument();
    expect(screen.queryByText("Generate")).not.toBeInTheDocument();
  });

  test("shows 'personalization not started' with a manual generate action when personalizable but nothing generated yet", async () => {
    mockGetTextVariants.mockResolvedValue(response());

    render(<TextVariantStatusIndicator templateId="tmpl-1" />);

    expect(await screen.findByText("Personalization not started")).toBeInTheDocument();
    expect(screen.getByText("Generate")).toBeInTheDocument();
  });

  test("clicking the generate action triggers generateTextVariants and refreshes the chip on success", async () => {
    mockGetTextVariants.mockResolvedValue(response());
    mockGenerateTextVariants.mockResolvedValue(response({ textPersonalizationReady: true }));

    render(<TextVariantStatusIndicator templateId="tmpl-1" />);

    const generateButton = await screen.findByText("Generate");
    await act(async () => {
      generateButton.click();
    });

    expect(mockGenerateTextVariants).toHaveBeenCalledWith("tmpl-1");
    expect(await screen.findByText("Personalization ready")).toBeInTheDocument();
  });

  test("renders nothing while the status is still loading, then appears once resolved", async () => {
    let resolvePromise!: (value: TextVariantsResponse) => void;
    mockGetTextVariants.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );

    const { container } = render(<TextVariantStatusIndicator templateId="tmpl-1" />);
    expect(container).toBeEmptyDOMElement();

    resolvePromise(response({ textPersonalizationReady: true }));
    await waitFor(() => expect(screen.getByText("Personalization ready")).toBeInTheDocument());
  });
});
