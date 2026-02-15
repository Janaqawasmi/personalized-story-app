import { Box } from "@mui/material";
import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useLanguage } from "./i18n/context/useLanguage";
import { useTranslation } from "./i18n/useTranslation";
import { useReader } from "./contexts/ReaderContext";

import Navbar from "./components/layout/Navbar";
import Footer from "./components/Footer";
import LanguageLayout from "./components/layout/LanguageLayout";
import ThemeWrapper from "./components/layout/ThemeWrapper";
import HomePage from "./pages/HomePage";
import AgeResultsPage from "./pages/AgeResultsPage";
import CategoryResultsPage from "./pages/CategoryResultsPage";
import TopicResultsPage from "./pages/TopicResultsPage";

import AdminStoryBriefForm from "./pages/AdminStoryBriefForm";
import GenerateDraftPage from "./pages/GenerateDraftPage";
import SpecialistDraftList from "./pages/SpecialistDraftList";
import ReviewDraftPage from "./pages/ReviewDraftPage";
import PromptPreviewPage from "./pages/PromptPreviewPage";

import PlaceholderPage from "./pages/PlaceholderPage";
import LoginPage from "./pages/LoginPage";
import SearchPage from "./pages/SearchPage";
import BookReaderPage from "./pages/BookReaderPage";
import PersonalizeStoryPage from "./pages/PersonalizeStoryPage";
import AllBooksPage from "./pages/AllBooksPage";

import { MegaSelection } from "./components/MegaMenu/types";

function AppContent() {
  const [selection, setSelection] = useState<MegaSelection>({
    age: null,
    category: null,
    topic: null,
  });

  const { direction } = useLanguage();
  const t = useTranslation();
  const { isFullScreen } = useReader();

  return (
    <ThemeWrapper>
      <Box dir={direction}>
      {!isFullScreen && (
        <Navbar
          currentSelection={selection}
          onApplyFilters={(sel: MegaSelection) => {
            setSelection(sel);
          }}
        />
      )}
      <Box sx={{ pt: isFullScreen ? 0 : 10 }}>
        <Routes>
          {/* ───────────── HOME ───────────── */}
          <Route index element={<HomePage />} />

          {/* ───────────── STORY BROWSING ───────────── */}
          <Route path="books" element={<AllBooksPage />} />
          <Route path="stories/age/:ageId" element={<AgeResultsPage />} />
          <Route
            path="stories/category/:categoryId"
            element={<CategoryResultsPage />}
          />
          <Route path="stories/topic/:topicId" element={<TopicResultsPage />} />
          <Route
            path="stories/:storyId/personalize"
            element={<PersonalizeStoryPage />}
          />
          <Route path="stories/:storyId/read" element={<BookReaderPage />} />

          {/* ───────────── USER PAGES ───────────── */}
          <Route path="search" element={<SearchPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route
            path="cart"
            element={
              <PlaceholderPage
                title={t("pages.cart.title")}
                message={t("pages.cart.message")}
              />
            }
          />

          {/* ───────────── SPECIALIST ───────────── */}
          <Route path="specialist">
            <Route index element={<SpecialistDraftList />} />
            <Route path="create-brief" element={<AdminStoryBriefForm />} />
            <Route path="generate-draft" element={<GenerateDraftPage />} />
            <Route path="drafts" element={<SpecialistDraftList />} />
            <Route path="drafts/:draftId" element={<ReviewDraftPage />} />
            <Route
              path="story-briefs/:briefId/prompt-preview"
              element={<PromptPreviewPage />}
            />
          </Route>

          <Route path="*" element={<Navigate to="/he" replace />} />
        </Routes>
      </Box>

      {!isFullScreen && (
        <Box sx={{ mt: 10 }}>
          <Footer />
        </Box>
      )}
    </Box>
    </ThemeWrapper>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root redirect to /he */}
        <Route path="/" element={<Navigate to="/he" replace />} />
        
        {/* Language-prefixed routes */}
        <Route path="/:lang/*" element={<LanguageLayout />}>
          <Route path="*" element={<AppContent />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
