import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { LanguageProvider } from "./i18n/context/LanguageContext";
import { ReaderProvider } from "./contexts/ReaderContext";

function renderApp() {
  return render(
    <LanguageProvider initialLanguage="he">
      <ReaderProvider>
        <App />
      </ReaderProvider>
    </LanguageProvider>
  );
}

test("renders app shell after language route resolves", async () => {
  renderApp();
  await waitFor(() => {
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });
});
