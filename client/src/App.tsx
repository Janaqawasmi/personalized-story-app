import { Container } from "@mui/material";
import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

/* Parent / Child UI components */
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import AgeSection from "./components/AgeSection";
import TopicSection from "./components/TopicSection";
import StoryListSection from "./components/StoryListSection";
import Footer from "./components/Footer";

import ChildInfoForm from "./components/personalization/ChildInfoForm";
import FinalPreviewStep from "./components/personalization/FinalPreviewStep";

/* Specialist / Admin pages */
import AdminStoryBriefForm from "./pages/AdminStoryBriefForm";
import GenerateDraftPage from "./pages/GenerateDraftPage";
import SpecialistDraftList from "./pages/SpecialistDraftList";
import SpecialistDraftReview from "./pages/SpecialistDraftReview";
import SpecialistStoryPromptPreview from "./pages/SpecialistStoryPromptPreview";

/* API */
import { fetchStories } from "./api/stories";

export default function App() {
  /* Parent flow state */
  const [selectedAge, setSelectedAge] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [selectedStory, setSelectedStory] = useState<any | null>(null);

  const [currentStep, setCurrentStep] =
    useState<"form" | "final">("form");

  const [personalizationData, setPersonalizationData] =
    useState<any>(null);

  /* Fetch stories when age + topic selected */
  useEffect(() => {
    if (selectedAge && selectedTopic) {
      fetchStories(selectedAge, selectedTopic).then(setStories);
    }
  }, [selectedAge, selectedTopic]);

  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        {/* ===================== */}
        {/* 🌍 Parent / Child Flow */}
        {/* ===================== */}
        <Route
          path="/"
          element={
            <Container maxWidth="lg">
              {/* STEP 1 — Story browsing */}
              {!selectedStory && (
                <>
                  <Hero />

                  <AgeSection
                    selectedAge={selectedAge}
                    onSelectAge={(age) => {
                      setSelectedAge(age);
                      setSelectedTopic(null);
                      setStories([]);
                    }}
                  />

                  {selectedAge && (
                    <TopicSection
                      selectedTopic={selectedTopic}
                      onSelectTopic={setSelectedTopic}
                    />
                  )}

                  {selectedAge && selectedTopic && (
                    <StoryListSection
                      stories={stories}
                      onSelectStory={(story) => {
                        setSelectedStory(story);
                        setCurrentStep("form");
                      }}
                    />
                  )}
                </>
              )}

              {/* STEP 2 — Child info form */}
              {selectedStory && currentStep === "form" && (
                <ChildInfoForm
                  storyTitle={selectedStory.title}
                  onBack={() => setSelectedStory(null)}
                  onContinue={(data) => {
                    setPersonalizationData(data);
                    setCurrentStep("final");
                  }}
                />
              )}

              {/* STEP 3 — Final preview */}
              {selectedStory &&
                currentStep === "final" &&
                personalizationData && (
                  <FinalPreviewStep
                    storyTitle={selectedStory.title}
                    data={personalizationData}
                    onBack={() => setCurrentStep("form")}
                    onGenerate={() =>
                      alert("Generate story — next phase 🚀")
                    }
                  />
                )}
            </Container>
          }
        />

        {/* ===================== */}
        {/* 🧠 Specialist / Admin */}
        {/* ===================== */}
        <Route
          path="/specialist/create-brief"
          element={<AdminStoryBriefForm />}
        />
        <Route
          path="/specialist/generate-draft"
          element={<GenerateDraftPage />}
        />
        <Route
          path="/specialist/drafts"
          element={<SpecialistDraftList />}
        />
        <Route
          path="/specialist/drafts/:draftId"
          element={<SpecialistDraftReview />}
        />
        <Route
          path="/specialist/story-briefs/:briefId/prompt-preview"
          element={<SpecialistStoryPromptPreview />}
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Footer />
    </BrowserRouter>
  );
}
