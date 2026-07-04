import { render, screen } from "@testing-library/react";
import CartPage from "./CartPage";

jest.mock("../i18n/navigation", () => ({
  useLangNavigate: () => jest.fn(),
}));

jest.mock("../i18n/useTranslation", () => ({
  useTranslation: () => (key: string) => key,
}));

jest.mock("../i18n/context/useLanguage", () => ({
  useLanguage: () => ({ direction: "ltr" }),
}));

jest.mock("../hooks/useMyCart", () => ({
  useMyCart: () => ({
    items: [
      {
        cartItemId: "cart-1",
        caregiverUid: "caregiver-1",
        previewId: "preview-1",
        templateId: "template-1",
        templateTitle: "Brave Night",
        childFirstName: "Noa",
        coverImageUrl: null,
        purchaseFormat: "print",
        priceCents: 5999,
        currency: "ILS",
        language: "he",
        addedAt: null,
      },
    ],
    loading: false,
    error: null,
    totalCents: 5999,
  }),
}));

jest.mock("../api/caregiverApi", () => ({
  removeFromCart: jest.fn(),
  checkout: jest.fn(),
}));

describe("CartPage", () => {
  it("shows the selected purchase format for each cart item", () => {
    render(<CartPage />);

    expect(screen.getByText("Brave Night")).toBeInTheDocument();
    expect(screen.getByText("Print")).toBeInTheDocument();
  });
});
