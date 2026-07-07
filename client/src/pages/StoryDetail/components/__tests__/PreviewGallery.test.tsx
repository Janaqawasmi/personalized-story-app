import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "../../../../i18n/context/LanguageContext";
import PreviewGallery from "../PreviewGallery";
import type { PreviewSpreadVM } from "../../types/story";

const SPREADS: PreviewSpreadVM[] = [
  { text: { en: "Once there was a boy named Adam who felt a little worried." } },
  { text: { en: "Adam took a deep breath and felt braver." } },
];

function renderGallery(overrides: Partial<React.ComponentProps<typeof PreviewGallery>> = {}) {
  return render(
    <LanguageProvider initialLanguage="en">
      <PreviewGallery
        spreads={SPREADS}
        language="en"
        onPersonalize={jest.fn()}
        personalizationEnabled
        canStartPersonalization
        comingSoon={false}
        {...overrides}
      />
    </LanguageProvider>,
  );
}

describe("PreviewGallery — bridge/hint match the story's actual personalization state", () => {
  it("shows the personalize bridge and child-name hint when the wizard can run", () => {
    renderGallery({ personalizationEnabled: true, canStartPersonalization: true });

    expect(screen.getByText("Ready to make it about your child?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /personalize this story/i })).toBeInTheDocument();
    expect(screen.getByText(/becomes your child's name/i)).toBeInTheDocument();
  });

  it("shows a 'get the complete story' bridge (and no child-name hint) for fixed, non-personalizable stories", () => {
    const onBuy = jest.fn();
    renderGallery({ personalizationEnabled: false, canStartPersonalization: false, onBuy });

    expect(screen.getByText("Ready to read the whole story?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /buy this story/i })).toBeInTheDocument();
    expect(screen.queryByText(/becomes your child's name/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /personalize this story/i })).not.toBeInTheDocument();
  });

  it("shows a 'coming soon' note (no dead-end button) when personalization is intended but not ready yet", () => {
    renderGallery({ personalizationEnabled: true, canStartPersonalization: false });

    expect(screen.getByText("Personalization coming soon")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /personalize this story/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /buy this story/i })).not.toBeInTheDocument();
  });
});
