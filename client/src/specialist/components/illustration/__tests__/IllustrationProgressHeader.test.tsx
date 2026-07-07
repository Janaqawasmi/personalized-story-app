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

  // ---------------------------------------------------------------------
  // The lower "All illustrations approved" gallery card used to duplicate
  // this card's readiness message and repeat the Preview/Publish actions.
  // Once illustration_ready, this single card carries both the readiness
  // message and the actions — no other card should repeat them.
  // ---------------------------------------------------------------------

  test("offers Preview/Publish actions and helper copy once illustration_ready", () => {
    const onPreviewClick = jest.fn();
    const onPublishClick = jest.fn();
    render(
      <IllustrationProgressHeader
        approvedCount={8}
        totalCount={8}
        liveStatus="illustration_ready"
        canPreview
        showPublish
        onPreviewClick={onPreviewClick}
        onPublishClick={onPublishClick}
      />,
    );

    expect(
      screen.getByText("The book is ready for final preview before publishing."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview book" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Publish" })).toBeEnabled();
  });

  test("disables the Preview action when no preview model is available yet", () => {
    render(
      <IllustrationProgressHeader
        approvedCount={8}
        totalCount={8}
        liveStatus="illustration_ready"
        canPreview={false}
        showPublish
        onPreviewClick={jest.fn()}
        onPublishClick={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Preview book" })).toBeDisabled();
  });

  test("does not show ready-to-publish helper copy or actions while still in progress", () => {
    render(
      <IllustrationProgressHeader
        approvedCount={2}
        totalCount={8}
        liveStatus="illustration_workspace"
        canPreview
        showPublish={false}
        onPreviewClick={jest.fn()}
      />,
    );

    expect(
      screen.queryByText("The book is ready for final preview before publishing."),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Preview book" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publish" })).not.toBeInTheDocument();
  });
});
