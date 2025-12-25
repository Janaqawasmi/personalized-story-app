import { Box } from "@mui/material";
import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Navbar from "./components/layout/Navbar";
import Footer from "./components/Footer";
import HomePage from "./pages/HomePage";
import AgeResultsPage from "./pages/AgeResultsPage";
import CategoryResultsPage from "./pages/CategoryResultsPage";
import TopicResultsPage from "./pages/TopicResultsPage";

import AdminStoryBriefForm from "./pages/AdminStoryBriefForm";
import GenerateDraftPage from "./pages/GenerateDraftPage";
import SpecialistDraftList from "./pages/SpecialistDraftList";
import SpecialistDraftReview from "./pages/SpecialistDraftReview";
import SpecialistStoryPromptPreview from "./pages/SpecialistStoryPromptPreview";
import PlaceholderPage from "./pages/PlaceholderPage";
import LoginPage from "./pages/LoginPage";

import { MegaSelection } from "./components/MegaMenu/types";

export default function App() {
  const [selection, setSelection] = useState<MegaSelection>({
    age: null,
    category: null,
    topic: null,
  });

  // ─────────────────────────────────────────────
  return (
    <Box dir="rtl">
      <BrowserRouter>
        <Navbar
          currentSelection={selection}
          onApplyFilters={(sel: MegaSelection) => {
            setSelection(sel);
          }}
        />

        <Box sx={{ pt: 10 }}>
          <Routes>
            {/* ───────────── HOME ───────────── */}
            <Route path="/" element={<HomePage />} />

            {/* ───────────── STORY BROWSING ───────────── */}
            <Route path="/stories/age/:ageId" element={<AgeResultsPage />} />
            <Route
              path="/stories/category/:categoryId"
              element={<CategoryResultsPage />}
            />
            <Route path="/stories/topic/:topicId" element={<TopicResultsPage />} />

            {/* ───────────── USER PAGES ───────────── */}
            <Route
              path="/search"
              element={
                <PlaceholderPage
                  title="חיפוש"
                  message="דף החיפוש יופיע כאן בקרוב"
                />
              }
            />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/cart"
              element={
                <PlaceholderPage
                  title="עגלת קניות"
                  message="עגלת הקניות שלך תופיע כאן"
                />
              }
            />

            {/* ───────────── SPECIALIST ───────────── */}
            <Route path="/specialist/create-brief" element={<AdminStoryBriefForm />} />
            <Route path="/specialist/generate-draft" element={<GenerateDraftPage />} />
            <Route path="/specialist/drafts" element={<SpecialistDraftList />} />
            <Route path="/specialist/drafts/:draftId" element={<SpecialistDraftReview />} />
            <Route
              path="/specialist/story-briefs/:briefId/prompt-preview"
              element={<SpecialistStoryPromptPreview />}
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Box>

        <Box sx={{ mt: 10 }}>
          <Footer />
        </Box>
      </BrowserRouter>
    </Box>
  );
}
