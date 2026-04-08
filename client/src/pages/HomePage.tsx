import { Box, Divider } from "@mui/material";

import HeroSection from "../components/home/HeroSection";
import CategoryStrip from "../components/home/CategoryStrip";
import HowItWorksSection from "../components/home/HowItWorksSection";
import PersonalizationDemo from "../components/home/PersonalizationDemo";
import TrustStatsStrip from "../components/home/TrustStatsStrip";
import TestimonialsSection from "../components/home/TestimonialsSection";
import FinalCTASection from "../components/home/FinalCTASection";

export default function HomePage() {
  return (
    <Box>
      <HeroSection />
      <CategoryStrip />
      <HowItWorksSection />
      <Divider sx={{ borderColor: "#D0C8C0" }} />
      {/* Featured stories: fetch featured story_templates when ready; use StoryGridCard + SectionHeader (home.featured.*) */}
      <PersonalizationDemo />
      <TrustStatsStrip />
      <TestimonialsSection />
      <FinalCTASection />
    </Box>
  );
}
