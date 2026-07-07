import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AdminSituationSuggestionsPage from "../AdminSituationSuggestionsPage";
import {
  listPendingSituationSuggestions,
  approveSituationSuggestion,
  rejectSituationSuggestion,
  type AdminSituationSuggestion,
} from "../../../api/adminSituationSuggestions";

jest.mock("../../../api/adminSituationSuggestions");

jest.mock("../../../i18n/useTranslation", () => ({
  useTranslation: () => (key: string, params?: Record<string, string | number>) => {
    if (!params) return key;
    return key.replace(/\{(\w+)\}/g, (_m, p) => String(params[p] ?? `{${p}}`));
  },
}));

const mockList = listPendingSituationSuggestions as jest.MockedFunction<
  typeof listPendingSituationSuggestions
>;
const mockApprove = approveSituationSuggestion as jest.MockedFunction<
  typeof approveSituationSuggestion
>;
const mockReject = rejectSituationSuggestion as jest.MockedFunction<
  typeof rejectSituationSuggestion
>;

function suggestion(overrides: Partial<AdminSituationSuggestion> = {}): AdminSituationSuggestion {
  return {
    templateId: "tmpl-1",
    title: "The Brave Fox",
    slug: "the-brave-fox",
    primaryTopic: "fear_anxiety",
    labelHe: "פחד מכלבים",
    labelAr: "الخوف من الكلاب",
    labelEn: "Fear of dogs",
    reason: "No existing situation covers dog phobia specifically.",
    createdBy: "specialist-uid-1",
    createdAt: 1700000000000,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminSituationSuggestionsPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AdminSituationSuggestionsPage — loading/empty/error states", () => {
  test("shows a loading state while the list is being fetched", async () => {
    let resolvePromise!: (value: AdminSituationSuggestion[]) => void;
    mockList.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );

    renderPage();

    expect(screen.getByText("admin.common.loading")).toBeInTheDocument();

    resolvePromise([]);
    await waitFor(() => expect(screen.queryByText("admin.common.loading")).not.toBeInTheDocument());
  });

  test("shows the empty state when there are no pending suggestions", async () => {
    mockList.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText("admin.situationSuggestions.emptyTitle")).toBeInTheDocument();
    expect(screen.getByText("admin.situationSuggestions.emptyBody")).toBeInTheDocument();
  });

  test("shows an error state and lets the admin retry when loading fails", async () => {
    mockList.mockRejectedValueOnce(new Error("network down"));
    mockList.mockResolvedValueOnce([]);

    renderPage();

    expect(await screen.findByText("admin.situationSuggestions.errorTitle")).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "admin.situationSuggestions.retry" }));

    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("admin.situationSuggestions.emptyTitle")).toBeInTheDocument();
  });
});

describe("AdminSituationSuggestionsPage — rendering a pending suggestion", () => {
  test("shows the story title, topic, pending status, labels in all three languages, and reason", async () => {
    mockList.mockResolvedValue([suggestion()]);

    renderPage();

    expect(await screen.findByText("The Brave Fox")).toBeInTheDocument();
    expect(screen.getByText("fear_anxiety")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("פחד מכלבים")).toBeInTheDocument();
    expect(screen.getByText("الخوف من الكلاب")).toBeInTheDocument();
    expect(screen.getByText("Fear of dogs")).toBeInTheDocument();
    expect(screen.getByText(/No existing situation covers dog phobia/)).toBeInTheDocument();
  });

  test("falls back to the untitled-story label when the story has no title", async () => {
    mockList.mockResolvedValue([suggestion({ title: "" })]);

    renderPage();

    expect(await screen.findByText("admin.situationSuggestions.untitledStory")).toBeInTheDocument();
  });
});

describe("AdminSituationSuggestionsPage — approve flow", () => {
  test("opens the approve dialog pre-filled with a suggested situation id, submits, removes the card, and shows a success toast", async () => {
    mockList.mockResolvedValue([suggestion()]);
    mockApprove.mockResolvedValue({ situationId: "fear_of_dogs", alreadyApproved: false });

    renderPage();
    await screen.findByText("The Brave Fox");

    await userEvent.click(screen.getByRole("button", { name: "admin.situationSuggestions.approve" }));

    const dialog = await screen.findByRole("dialog");
    const idField = within(dialog).getByLabelText("admin.situationSuggestions.situationIdLabel");
    // Auto-suggested from the English label ("Fear of dogs" -> "fear_of_dogs").
    expect(idField).toHaveValue("fear_of_dogs");

    await userEvent.click(
      within(dialog).getByRole("button", { name: "admin.situationSuggestions.confirmApprove" }),
    );

    await waitFor(() => expect(mockApprove).toHaveBeenCalledWith("tmpl-1", "fear_of_dogs"));
    await waitFor(() => expect(screen.queryByText("The Brave Fox")).not.toBeInTheDocument());
    expect(await screen.findByText("admin.situationSuggestions.approveSuccess")).toBeInTheDocument();
  });

  test("lets the admin edit the situation id before approving", async () => {
    mockList.mockResolvedValue([suggestion()]);
    mockApprove.mockResolvedValue({ situationId: "custom_id", alreadyApproved: false });

    renderPage();
    await screen.findByText("The Brave Fox");
    await userEvent.click(screen.getByRole("button", { name: "admin.situationSuggestions.approve" }));

    const dialog = await screen.findByRole("dialog");
    const idField = within(dialog).getByLabelText("admin.situationSuggestions.situationIdLabel");
    await userEvent.clear(idField);
    await userEvent.type(idField, "custom_id");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "admin.situationSuggestions.confirmApprove" }),
    );

    await waitFor(() => expect(mockApprove).toHaveBeenCalledWith("tmpl-1", "custom_id"));
  });

  test("shows an inline error and keeps the suggestion in the list when approval fails", async () => {
    mockList.mockResolvedValue([suggestion()]);
    mockApprove.mockRejectedValue(new Error("referenceData/situations/items/fear_of_dogs already exists."));

    renderPage();
    await screen.findByText("The Brave Fox");
    await userEvent.click(screen.getByRole("button", { name: "admin.situationSuggestions.approve" }));

    const dialog = await screen.findByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "admin.situationSuggestions.confirmApprove" }),
    );

    expect(await within(dialog).findByText(/already exists/)).toBeInTheDocument();
    // The suggestion must still be in the list — the failed action did not remove it.
    expect(screen.getByText("The Brave Fox")).toBeInTheDocument();
  });
});

describe("AdminSituationSuggestionsPage — reject flow", () => {
  test("opens the reject dialog, submits an optional note, removes the card, and shows a success toast", async () => {
    mockList.mockResolvedValue([suggestion()]);
    mockReject.mockResolvedValue({ alreadyRejected: false });

    renderPage();
    await screen.findByText("The Brave Fox");

    await userEvent.click(screen.getByRole("button", { name: "admin.situationSuggestions.reject" }));

    const dialog = await screen.findByRole("dialog");
    const noteField = within(dialog).getByLabelText("admin.situationSuggestions.rejectNoteLabel");
    await userEvent.type(noteField, "Covered by an existing situation.");

    await userEvent.click(
      within(dialog).getByRole("button", { name: "admin.situationSuggestions.confirmReject" }),
    );

    await waitFor(() =>
      expect(mockReject).toHaveBeenCalledWith("tmpl-1", "Covered by an existing situation."),
    );
    await waitFor(() => expect(screen.queryByText("The Brave Fox")).not.toBeInTheDocument());
    expect(await screen.findByText("admin.situationSuggestions.rejectSuccess")).toBeInTheDocument();
  });

  test("rejecting does not require a note", async () => {
    mockList.mockResolvedValue([suggestion()]);
    mockReject.mockResolvedValue({ alreadyRejected: false });

    renderPage();
    await screen.findByText("The Brave Fox");
    await userEvent.click(screen.getByRole("button", { name: "admin.situationSuggestions.reject" }));

    const dialog = await screen.findByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "admin.situationSuggestions.confirmReject" }),
    );

    await waitFor(() => expect(mockReject).toHaveBeenCalledWith("tmpl-1", ""));
  });
});
