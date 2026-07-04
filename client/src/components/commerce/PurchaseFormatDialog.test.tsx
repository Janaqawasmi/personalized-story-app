import { fireEvent, render, screen } from "@testing-library/react";
import PurchaseFormatDialog from "./PurchaseFormatDialog";

describe("PurchaseFormatDialog", () => {
  it("lets the buyer choose the digital format", async () => {
    const onSelect = jest.fn();

    render(
      <PurchaseFormatDialog
        open
        onClose={jest.fn()}
        onSelect={onSelect}
        currency="ILS"
        digitalPrice={29.99}
        printPrice={59.99}
        printAvailable
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /digital/i }));
    expect(onSelect).toHaveBeenCalledWith("digital");
  });

  it("lets the buyer choose the print format when available", async () => {
    const onSelect = jest.fn();

    render(
      <PurchaseFormatDialog
        open
        onClose={jest.fn()}
        onSelect={onSelect}
        currency="ILS"
        digitalPrice={29.99}
        printPrice={59.99}
        printAvailable
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /print/i }));
    expect(onSelect).toHaveBeenCalledWith("print");
  });

  it("shows print as coming soon when unavailable", () => {
    render(
      <PurchaseFormatDialog
        open
        onClose={jest.fn()}
        onSelect={jest.fn()}
        currency="ILS"
        digitalPrice={29.99}
        printAvailable={false}
      />,
    );

    expect(screen.getByText(/print version coming soon/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /print/i })).toBeDisabled();
  });
});
