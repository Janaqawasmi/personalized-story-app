import { fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider, type Language } from "../../../../i18n/context/LanguageContext";
import PricingCard from "../PricingCard";

function renderCard(
  props: Partial<React.ComponentProps<typeof PricingCard>> = {},
  language: Language = "en",
) {
  return render(
    <LanguageProvider initialLanguage={language}>
      <PricingCard
        priceDigital={29.99}
        pricePrint={59.99}
        currency="ILS"
        printAvailable
        status="published"
        {...props}
      />
    </LanguageProvider>,
  );
}

describe("PricingCard", () => {
  it("shows the Digital price by default", () => {
    renderCard();
    expect(screen.getByText("₪29.99")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Digital" })).toBeInTheDocument();
  });

  it("always renders a Print option, disabled and labeled 'Coming soon' when print isn't available", () => {
    renderCard({ printAvailable: false, pricePrint: undefined });

    const printTab = screen.getByRole("button", { name: /print/i });
    expect(printTab).toBeInTheDocument();
    expect(printTab).toBeDisabled();
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });

  it("switches to the Print price when Print is available and selected", () => {
    renderCard({ printAvailable: true, pricePrint: 59.99 });

    fireEvent.click(screen.getByRole("button", { name: "Print" }));

    expect(screen.getByText("₪59.99")).toBeInTheDocument();
    expect(screen.getByText("shipped to you")).toBeInTheDocument();
  });

  it("shows the trust note that preview comes before payment", () => {
    renderCard();
    expect(screen.getByText("Preview before paying")).toBeInTheDocument();
  });

  it("shows a coming-soon price chip for stories not yet on sale", () => {
    renderCard({ status: "coming_soon" });
    expect(screen.getAllByText("Coming soon").length).toBeGreaterThan(0);
  });
});
