import { fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider, type Language } from "../../i18n/context/LanguageContext";
import PurchaseFormatDialog from "./PurchaseFormatDialog";

const VALID_SHIPPING = {
  fullName: "Noa Cohen",
  phoneNumber: "050-1234567",
  city: "Tel Aviv",
  streetAddress: "Herzl 1",
};

function renderDialog(
  props: Partial<React.ComponentProps<typeof PurchaseFormatDialog>> = {},
  language: Language = "en",
) {
  return render(
    <LanguageProvider initialLanguage={language}>
      <PurchaseFormatDialog
        open
        onClose={jest.fn()}
        onSelect={jest.fn()}
        currency="ILS"
        digitalPrice={29.99}
        printPrice={59.99}
        printAvailable
        {...props}
      />
    </LanguageProvider>,
  );
}

function fillShippingForm() {
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: VALID_SHIPPING.fullName } });
  fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: VALID_SHIPPING.phoneNumber } });
  fireEvent.change(screen.getByLabelText(/^city/i), { target: { value: VALID_SHIPPING.city } });
  fireEvent.change(screen.getByLabelText(/street address/i), { target: { value: VALID_SHIPPING.streetAddress } });
}

describe("PurchaseFormatDialog", () => {
  it("lets the buyer choose the digital format immediately (no shipping form)", async () => {
    const onSelect = jest.fn();
    renderDialog({ onSelect });

    fireEvent.click(screen.getByRole("button", { name: /digital/i }));
    expect(onSelect).toHaveBeenCalledWith("digital");
  });

  it("shows a shipping/contact form when Print is chosen, instead of selecting immediately", async () => {
    const onSelect = jest.fn();
    renderDialog({ onSelect });

    fireEvent.click(screen.getByRole("button", { name: /print/i }));

    // Not selected yet — the shipping form must be completed first.
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
  });

  it("calls onSelect('print', shippingDetails) only after the shipping form is validly submitted", async () => {
    const onSelect = jest.fn();
    renderDialog({ onSelect });

    fireEvent.click(screen.getByRole("button", { name: /print/i }));
    fillShippingForm();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(onSelect).toHaveBeenCalledWith("print", VALID_SHIPPING);
  });

  it("blocks submission and shows field errors when required shipping fields are missing", async () => {
    const onSelect = jest.fn();
    renderDialog({ onSelect });

    fireEvent.click(screen.getByRole("button", { name: /print/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
  });

  it("returns to the format step when Back is clicked from the shipping form", async () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: /print/i }));
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByRole("button", { name: /digital/i })).toBeInTheDocument();
  });

  it("shows print as coming soon when unavailable, and never opens the shipping form", () => {
    renderDialog({ printAvailable: false, printPrice: undefined });

    expect(screen.getByText(/print version coming soon/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /print/i })).toBeDisabled();
  });

  describe("localization", () => {
    it("renders the format step in Hebrew", () => {
      renderDialog({}, "he");

      expect(screen.getByText("איזו גרסה תרצו?")).toBeInTheDocument();
      expect(screen.getByText("דיגיטלית")).toBeInTheDocument();
      expect(screen.getByText("מודפסת")).toBeInTheDocument();
      expect(screen.getByText("קריאה באתר לאחר הרכישה")).toBeInTheDocument();
    });

    it("renders the format step in Arabic", () => {
      renderDialog({}, "ar");

      expect(screen.getByText("أي نسخة تريد؟")).toBeInTheDocument();
      expect(screen.getByText("رقمية")).toBeInTheDocument();
      expect(screen.getByText("مطبوعة")).toBeInTheDocument();
      expect(screen.getByText("القراءة عبر الموقع بعد الشراء")).toBeInTheDocument();
    });

    it("renders the print-unavailable and coming-soon text in Hebrew", () => {
      renderDialog({ printAvailable: false, printPrice: undefined }, "he");

      expect(screen.getByText("הגרסה המודפסת תהיה זמינה בקרוב")).toBeInTheDocument();
      expect(screen.getAllByText("בקרוב").length).toBeGreaterThan(0);
    });

    it("renders the print-unavailable and coming-soon text in Arabic", () => {
      renderDialog({ printAvailable: false, printPrice: undefined }, "ar");

      expect(screen.getByText("النسخة المطبوعة قريبًا")).toBeInTheDocument();
      expect(screen.getAllByText("قريبًا").length).toBeGreaterThan(0);
    });

    it("switches the shipping form step to Hebrew when Print is chosen", () => {
      renderDialog({}, "he");

      fireEvent.click(screen.getByText("מודפסת"));

      expect(screen.getByText("פרטי משלוח")).toBeInTheDocument();
    });
  });
});
