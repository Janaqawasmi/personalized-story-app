import { Container } from "@mui/material";
import MeaningfulStepsSection from "../components/MeaningfulStepsSection";
import StoryJourneySection from "../components/home/StoryJourneySection";

export default function HomePage() {
  return (
    <>
      <Container maxWidth="lg" sx={{ pb: 4 }}>
        {/* Other homepage content can go here */}
      </Container>
      <StoryJourneySection />
      <MeaningfulStepsSection />
    </>
  );
}

