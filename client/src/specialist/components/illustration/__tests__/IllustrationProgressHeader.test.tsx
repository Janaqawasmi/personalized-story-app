import { render, screen } from "@testing-library/react";
import IllustrationProgressHeader from "../IllustrationProgressHeader";

jest.mock("../../../../i18n/specialistDeskUi", () => {
  const { SPECIALIST_DESK_EN } = jest.requireActual("../../../../i18n/specialistDeskLocales");
  return { useSpecialistDeskUi: () => SPECIALIST_DESK_EN };
});

describe("IllustrationProgressHeader", () => {
  test("shows the approved/total count and the correct progress bar value", () => {
    render(
      <IllustrationProgressHeader approvedCount={6} totalCount={8} liveStatus="illustration_workspace" />,
    );

    expect(screen.getByText("6 of 8 illustrations approved")).toBeInTheDocument();
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "75");
  });

  test("shows 'In progress' status while in illustration_workspace", () => {
    render(<IllustrationProgressHeader approvedCount={2} totalCount={8} liveStatus="illustration_workspace" />);
    expect(screen.getByText("In progress")).toBeInTheDocument();
  });

  test("shows 'Ready to publish' status once illustration_ready", () => {
    render(<IllustrationProgressHeader approvedCount={8} totalCount={8} liveStatus="illustration_ready" />);
    expect(screen.getByText("Ready to publish")).toBeInTheDocument();
  });

  test("shows 'Published' status once published", () => {
    render(<IllustrationProgressHeader approvedCount={8} totalCount={8} liveStatus="published" />);
    expect(screen.getByText("Published")).toBeInTheDocument();
  });

  test("shows 0% progress with zero pages without dividing by zero", () => {
    render(<IllustrationProgressHeader approvedCount={0} totalCount={0} liveStatus="illustration_workspace" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "0");
  });
});
