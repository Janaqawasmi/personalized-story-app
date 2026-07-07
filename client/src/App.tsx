import { Box } from "@mui/material";
import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { DEFAULT_LANGUAGE } from "./i18n/context/LanguageContext";
import { useLanguage } from "./i18n/context/useLanguage";
import { useTranslation } from "./i18n/useTranslation";
import { useReader } from "./contexts/ReaderContext";

import Navbar from "./components/layout/Navbar";
import SpecialistNavbar from "./components/specialist/SpecialistNavbar";
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
import IllustrationDebugPage from "./specialist/pages/IllustrationDebugPage";
import RequireAuth from "./components/RequireAuth";
import RequireRole from "./components/RequireRole";
import { AuthProvider } from "./contexts/AuthContext";

import LoginPage from "./pages/LoginPage";
import CartPage from "./pages/CartPage";
import MockCheckoutPage from "./pages/checkout/MockCheckoutPage";
import CheckoutSuccessPage from "./pages/checkout/CheckoutSuccessPage";
import CheckoutCancelPage from "./pages/checkout/CheckoutCancelPage";
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
import AdminUserDetailPage from "./pages/admin/AdminUserDetailPage";
import AdminPsychologistsPage from "./pages/admin/AdminPsychologistsPage";
import AdminSpecialistDetailPage from "./pages/admin/AdminSpecialistDetailPage";
import AdminStoriesPage from "./pages/admin/AdminStoriesPage";
import AdminAIPage from "./pages/admin/AdminAIPage";
import AdminRevenuePage from "./pages/admin/AdminRevenuePage";
import AdminPrintOrdersPage from "./pages/admin/AdminPrintOrdersPage";
import AdminAuditLogPage from "./pages/admin/AdminAuditLogPage";
import AdminSituationSuggestionsPage from "./pages/admin/AdminSituationSuggestionsPage";
import AdminReviewsPage from "./pages/admin/AdminReviewsPage";
import AdminBannerPage from "./pages/admin/AdminBannerPage";

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
  const { pathname } = useLocation();
  const isSpecialistRoute = /\/specialist(\/|$)/.test(pathname);
  const isAdminRoute = /\/admin(\/|$)/.test(pathname);

  return (
    <ThemeWrapper>
      <Box dir={direction}>
      {!isFullScreen &&
        (isSpecialistRoute ? (
          <SpecialistNavbar />
        ) : (
          <Navbar
            currentSelection={selection}
            onApplyFilters={(sel: MegaSelection) => {
              setSelection(sel);
            }}
          />
        ))}
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
            <Route path="cart" element={<CartPage />} />
          </Route>

          {/* ───────────── ADMIN (custom claim role === admin) ───────────── */}
          <Route path="admin" element={<RequireAdmin />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<AdminOverviewPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="users/:uid" element={<AdminUserDetailPage />} />
              <Route path="psychologists" element={<AdminPsychologistsPage />} />
              <Route path="psychologists/:specialistId" element={<AdminSpecialistDetailPage />} />
              <Route path="stories" element={<AdminStoriesPage />} />
              <Route path="situation-suggestions" element={<AdminSituationSuggestionsPage />} />
              <Route path="ai" element={<AdminAIPage />} />
              <Route path="reviews" element={<AdminReviewsPage />} />
              <Route path="banner" element={<AdminBannerPage />} />
              <Route path="revenue" element={<AdminRevenuePage />} />
              <Route path="print-orders" element={<AdminPrintOrdersPage />} />
              <Route path="audit-log" element={<AdminAuditLogPage />} />
              <Route path="system" element={<Navigate to="../audit-log" replace />} />
            </Route>
          </Route>

          {/* ───────────── SPECIALIST (custom claim role specialist or admin) ───────────── */}
          <Route path="specialist" element={<RequireRole allowedRoles={["specialist", "admin"]} />}>
            <Route element={<SpecialistLayout />}>
              <Route index element={<Navigate to="stories" replace />} />
              <Route path="stories" element={<SpecialistStoriesPage />} />
              <Route path="stories/new" element={<NewStoryRedirect />} />
              <Route path="stories/:storyId/illustration/debug" element={<IllustrationDebugPage />} />
              <Route path="stories/:storyId" element={<StoryWorkspacePage />} />
              <Route path="stories/:storyId/:tab" element={<StoryWorkspacePage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to={`/${DEFAULT_LANGUAGE}`} replace />} />
        </Routes>
      </Box>

      {!isFullScreen && !isSpecialistRoute && !isAdminRoute && <Footer />}
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
          {/* Root redirect to default language */}
          <Route path="/" element={<Navigate to={`/${DEFAULT_LANGUAGE}`} replace />} />

          {/*
            Checkout redirect targets are unprefixed by design: the backend
            builds them from FRONTEND_URL without knowing the caregiver's
            language (server/src/routes/caregiver/checkout.router.ts), and a
            real payment gateway's hosted page would redirect the same way.
          */}
          <Route path="/checkout/mock" element={<MockCheckoutPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />

          {/* Language-prefixed routes */}
          <Route path="/:lang/*" element={<LanguageLayout />}>
            <Route path="*" element={<AppContent />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
