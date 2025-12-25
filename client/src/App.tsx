import { Box, Container, Typography, Button } from "@mui/material";
import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Navbar from "./components/layout/Navbar";
import Footer from "./components/Footer";
import MeaningfulStepsSection from "./components/MeaningfulStepsSection";
import CategoryEntrySection from "./components/CategoryEntrySection";

import ChildInfoForm from "./components/personalization/ChildInfoForm";
import FinalPreviewStep from "./components/personalization/FinalPreviewStep";

import AdminStoryBriefForm from "./pages/AdminStoryBriefForm";
import GenerateDraftPage from "./pages/GenerateDraftPage";
import SpecialistDraftList from "./pages/SpecialistDraftList";
import SpecialistDraftReview from "./pages/SpecialistDraftReview";
import SpecialistStoryPromptPreview from "./pages/SpecialistStoryPromptPreview";
import PlaceholderPage from "./pages/PlaceholderPage";
import LoginPage from "./pages/LoginPage";

import { fetchStories } from "./api/stories";
import { MegaSelection, AgeId } from "./components/MegaMenu/types";
import { AGE_GROUPS } from "./components/MegaMenu/data";

type Story = {
  id: string;
  title: string;
};

type Step = "form" | "final";

export default function App() {
  const [selection, setSelection] = useState<MegaSelection>({
    age: null,
    category: null,
    topic: null,
  });

  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [step, setStep] = useState<Step>("form");
  const [personalizationData, setPersonalizationData] = useState<any>(null);

  // ─────────────────────────────────────────────
  // Fetch stories when topic changes
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!selection.topic) return;

    const ageParam = selection.age ?? "all";

    fetchStories(ageParam, selection.topic).then((data: any[]) => {
      setStories(
        data.map((s) => ({
          id: s.id,
          title: s.title ?? "סיפור ללא שם",
        }))
      );
    });
  }, [selection.age, selection.topic]);

  // ─────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────
  const resetFlow = () => {
    setStories([]);
    setSelectedStory(null);
    setStep("form");
  };

  const handleSelectStory = (storyIdOrObj: string | Story) => {
    const story =
      typeof storyIdOrObj === "string"
        ? stories.find((s) => s.id === storyIdOrObj) ?? null
        : storyIdOrObj;

    if (!story) return;

    setSelectedStory(story);
    setStep("form");
  };

  // ─────────────────────────────────────────────
  return (
    <Box dir="rtl">
      <BrowserRouter>
        <Navbar
          currentSelection={selection}
          onApplyFilters={(sel: MegaSelection) => {
            setSelection(sel);
            resetFlow();
          }}
        />

        <Box sx={{ pt: 10 }}>
          <Routes>
            {/* ───────────── HOME ───────────── */}
            <Route
              path="/"
              element={
                <Container maxWidth="lg" sx={{ pb: 10 }}>
                  {/* BEFORE STORY SELECTION */}
                  {!selectedStory && (
                    <>
                      {!selection.topic ? (
                        <MeaningfulStepsSection />
                      ) : (
                        <>
                          {/* Filter bar */}
                          <Box
                            sx={{
                              mt: 4,
                              mb: 3,
                              p: 2,
                              borderRadius: 2,
                              border: "1px solid rgba(0,0,0,0.08)",
                              background: "#fff",
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 2,
                              flexWrap: "wrap",
                            }}
                          >
                            <Box>
                              <Typography fontWeight={800}>
                                תוצאות עבור:
                                {` ${selection.category ?? "—"} / ${selection.topic}`}
                              </Typography>
                              <Typography fontSize="0.9rem" color="rgba(17,24,39,0.65)">
                                גיל:
                                {selection.age
                                  ? ` ${AGE_GROUPS.find(a => a.id === selection.age)?.label}`
                                  : " כל הגילאים"}
                              </Typography>
                            </Box>

                            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                              <Button
                                variant={selection.age === null ? "contained" : "outlined"}
                                onClick={() =>
                                  setSelection((p) => ({ ...p, age: null }))
                                }
                              >
                                כל הגילאים
                              </Button>

                              {AGE_GROUPS.map((age) => (
                                <Button
                                  key={age.id}
                                  variant={selection.age === age.id ? "contained" : "outlined"}
                                  onClick={() =>
                                    setSelection((p) => ({
                                      ...p,
                                      age: age.id as AgeId,
                                    }))
                                  }
                                >
                                  {age.label}
                                </Button>
                              ))}
                            </Box>
                          </Box>

                          <CategoryEntrySection />
                        </>
                      )}
                    </>
                  )}

                  {/* STEP 2 — PERSONALIZATION FORM - DISABLED FOR NOW */}
                  {/* {selectedStory && step === "form" && (
                    <ChildInfoForm
                      storyTitle={selectedStory.title}
                      onBack={() => setSelectedStory(null)}
                      onContinue={(data) => {
                        setPersonalizationData(data);
                        setStep("final");
                      }}
                    />
                  )} */}

                  {/* STEP 3 — FINAL PREVIEW - DISABLED FOR NOW */}
                  {/* {selectedStory && step === "final" && personalizationData && (
                    <FinalPreviewStep
                      storyTitle={selectedStory.title}
                      data={personalizationData}
                      onBack={() => setStep("form")}
                      onGenerate={() =>
                        alert("Generate story — Phase 6 🚀")
                      }
                    />
                  )} */}
                </Container>
              }
            />

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
