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
import AdminContractReviewPage from "./pages/AdminContractReviewPage";
import RequireAuth from "./components/RequireAuth";
import { AuthProvider } from "./contexts/AuthContext";

import PlaceholderPage from "./pages/PlaceholderPage";
import LoginPage from "./pages/LoginPage";
import SearchPage from "./pages/SearchPage";
import BookReaderPage from "./pages/BookReaderPage";
import PersonalizeStoryPage from "./pages/PersonalizeStoryPage";
import StoryDetailPage from "./pages/StoryDetailPage";
import AllBooksPage from "./pages/AllBooksPage";
import FavoritesPage from "./pages/FavoritesPage";
import MyStoriesPage from "./pages/MyStoriesPage";

import RequireAdmin from "./components/RequireAdmin";
import AdminLayout from "./pages/admin/components/AdminLayout";
import AdminOverviewPage from "./pages/admin/AdminOverviewPage";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminPsychologistsPage from "./pages/admin/AdminPsychologistsPage";
import AdminStoriesPage from "./pages/admin/AdminStoriesPage";
import AdminAIPage from "./pages/admin/AdminAIPage";
import AdminRevenuePage from "./pages/admin/AdminRevenuePage";
import AdminSystemPage from "./pages/admin/AdminSystemPage";
import AdminModerationPage from "./pages/admin/AdminModerationPage";

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
          <Route path="stories/:storyId" element={<StoryDetailPage />} />
          <Route element={<RequireAuth />}>
            <Route
              path="stories/:storyId/personalize"
              element={<PersonalizeStoryPage />}
            />
          </Route>
          <Route path="stories/:storyId/read" element={<BookReaderPage />} />

          {/* ───────────── USER PAGES ───────────── */}
          <Route path="search" element={<SearchPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route path="favorites" element={<FavoritesPage />} />
            <Route path="my-stories" element={<MyStoriesPage />} />
          </Route>
          <Route
            path="cart"
            element={
              <PlaceholderPage
                title={t("pages.cart.title")}
                message={t("pages.cart.message")}
              />
            }
          />

          {/* ───────────── ADMIN (custom claim role === admin) ───────────── */}
          <Route path="admin" element={<RequireAdmin />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<AdminOverviewPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="psychologists" element={<AdminPsychologistsPage />} />
              <Route path="stories" element={<AdminStoriesPage />} />
              <Route path="moderation" element={<AdminModerationPage />} />
              <Route path="ai" element={<AdminAIPage />} />
              <Route path="revenue" element={<AdminRevenuePage />} />
              <Route path="system" element={<AdminSystemPage />} />
            </Route>
          </Route>

          {/* ───────────── SPECIALIST ───────────── */}
          <Route path="specialist" element={<RequireAuth />}>
            <Route index element={<SpecialistDraftList />} />
            <Route path="create-brief" element={<AdminStoryBriefForm />} />
            <Route path="generate-draft" element={<GenerateDraftPage />} />
            <Route path="drafts" element={<SpecialistDraftList />} />
            <Route path="drafts/:draftId" element={<ReviewDraftPage />} />
            <Route
              path="story-briefs/:briefId/prompt-preview"
              element={<PromptPreviewPage />}
            />
            <Route
              path="story-briefs/:briefId/contract"
              element={<AdminContractReviewPage />}
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
      <AuthProvider>
        <Routes>
          {/* Root redirect to /he */}
          <Route path="/" element={<Navigate to="/he" replace />} />
          
          {/* Language-prefixed routes */}
          <Route path="/:lang/*" element={<LanguageLayout />}>
            <Route path="*" element={<AppContent />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
