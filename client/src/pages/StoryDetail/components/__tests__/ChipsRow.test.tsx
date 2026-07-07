import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "../../../../i18n/context/LanguageContext";
import ChipsRow from "../ChipsRow";

function renderChips(ageRange: string, topicLabel: string) {
  return render(
    <LanguageProvider initialLanguage="en">
      <ChipsRow ageRange={ageRange} topicLabel={topicLabel} />
    </LanguageProvider>,
  );
}

describe("ChipsRow", () => {
  it("keeps only the story-identifying badges near the title: age, topic, therapist-approved", () => {
    renderChips("3–6", "Fear & Anxiety");

    expect(screen.getByText("Ages 3–6")).toBeInTheDocument();
    expect(screen.getByText("Fear & Anxiety")).toBeInTheDocument();
    expect(screen.getByText("Therapist approved")).toBeInTheDocument();

    // Secondary trust signals now live in the features row below the hero,
    // not here — keeping this row short is what lets the CTA sit above the fold.
    expect(screen.queryByText("AI personalized")).not.toBeInTheDocument();
  });

  it("omits the age/topic chips gracefully when data is missing", () => {
    renderChips("", "");

    expect(screen.getByText("Therapist approved")).toBeInTheDocument();
    expect(screen.queryByText(/^Ages/)).not.toBeInTheDocument();
  });
});
