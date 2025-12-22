import { Container } from "@mui/material";
import { useEffect, useState } from "react";

import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import AgeSection from "./components/AgeSection";
import TopicSection from "./components/TopicSection";
import StoryListSection from "./components/StoryListSection";
import Footer from "./components/Footer";

import ChildInfoForm from "./components/personalization/ChildInfoForm";
import FinalPreviewStep from "./components/personalization/FinalPreviewStep";

import { fetchStories } from "./api/stories";

export default function App() {
  const [selectedAge, setSelectedAge] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [selectedStory, setSelectedStory] = useState<any | null>(null);

  /* ✅ NEW STATE */
  const [currentStep, setCurrentStep] =
    useState<"form" | "final">("form");

  const [personalizationData, setPersonalizationData] =
    useState<any>(null);

  useEffect(() => {
    if (selectedAge && selectedTopic) {
      fetchStories(selectedAge, selectedTopic).then(setStories);
    }
  }, [selectedAge, selectedTopic]);

  return (
    <>
      <Navbar />

      <Container maxWidth="lg">
        {/* STEP 1 — STORY BROWSING */}
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
                onSelectTopic={(topic) => setSelectedTopic(topic)}
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

        {/* STEP 2 — CHILD INFO FORM */}
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

        {/* STEP 3 — FINAL PREVIEW */}
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

      <Footer />
    </>
  );
}
