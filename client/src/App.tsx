import { Box } from "@mui/material";
import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useLanguage } from "./i18n/context/useLanguage";
import { useTranslation } from "./i18n/useTranslation";
import { useReader } from "./contexts/ReaderContext";

import Navbar from "./components/layout/Navbar";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import LanguageLayout from "./components/layout/LanguageLayout";
import ThemeWrapper from "./components/layout/ThemeWrapper";
import HomePage from "./pages/HomePage";
import AgeResultsPage from "./pages/AgeResultsPage";
import CategoryResultsPage from "./pages/CategoryResultsPage";
import TopicResultsPage from "./pages/TopicResultsPage";

import SpecialistLayout from "./components/specialist/SpecialistLayout";
import SpecialistStoriesPage from "./specialist/pages/SpecialistStoriesPage";
import NewStoryRedirect from "./specialist/pages/NewStoryRedirect";
import StoryWorkspacePage from "./specialist/pages/StoryWorkspacePage";
import RequireAuth from "./components/RequireAuth";
import { AuthProvider } from "./contexts/AuthContext";

import PlaceholderPage from "./pages/PlaceholderPage";
import LoginPage from "./pages/LoginPage";
import SearchPage from "./pages/SearchPage";
import BookReaderPage from "./pages/BookReaderPage";
import PersonalizeStoryPage from "./pages/PersonalizeStoryPage";
import StoryDetailPage from "./pages/StoryDetailPage";
import AllBooksPage from "./pages/AllBooksPage";
import MyStoriesPage from "./pages/MyStoriesPage";
import SuggestStoryPage from "./pages/suggest/SuggestStoryPage";

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
      {/* Match fixed Navbar AppBar height (components/layout/Navbar.tsx) — default theme spacing 7/7.5 → 56px / 60px */}
      <Box sx={{ pt: isFullScreen ? 0 : { xs: 7, md: 7.5 } }}>
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
          <Route path="suggest" element={<SuggestStoryPage />} />
          <Route element={<RequireAuth />}>
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
            <Route element={<SpecialistLayout />}>
              <Route index element={<Navigate to="stories" replace />} />
              <Route path="stories" element={<SpecialistStoriesPage />} />
              <Route path="stories/new" element={<NewStoryRedirect />} />
              <Route path="stories/:storyId" element={<StoryWorkspacePage />} />
              <Route path="stories/:storyId/:tab" element={<StoryWorkspacePage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/he" replace />} />
        </Routes>
      </Box>

      {!isFullScreen && (
        <Footer />
      )}
    </Box>
    </ThemeWrapper>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
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
