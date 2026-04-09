import { Box, Divider } from "@mui/material";

import HeroSection from "../components/home/HeroSection";
import CategoryStrip from "../components/home/CategoryStrip";
import HowItWorksSection from "../components/home/HowItWorksSection";
import FeaturedStoriesSection from "../components/home/FeaturedStoriesSection";
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
      <FeaturedStoriesSection />
      <Divider sx={{ borderColor: "#D0C8C0" }} />
      <PersonalizationDemo />
      <TrustStatsStrip />
      <TestimonialsSection />
      <FinalCTASection />
    </Box>
  );
}
