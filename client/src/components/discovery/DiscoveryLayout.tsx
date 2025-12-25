import { Box } from "@mui/material";
import { COLORS } from "../../theme";
import AgeColumn from "./AgeColumn";
import CategoryColumn from "./CategoryColumn";
import TopicColumn from "./TopicColumn";

type Props = {
  selectedAge: string | null;
  selectedCategory: string | null;
  stories: any[];
  onSelectAge: (age: string) => void;
  onSelectCategory: (category: string) => void;
  // onSelectStory is disabled for now
  // onSelectStory?: (story: any) => void;
};

export default function DiscoveryLayout({
  selectedAge,
  selectedCategory,
  stories,
  onSelectAge,
  onSelectCategory,
}: Props) {
  return (
    <Box sx={{ py: 4 }}>
      {/* Discovery columns */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(3, 1fr)",
          },
          gap: 3,
        }}
      >
        <AgeColumn
          selected={selectedAge}
          onSelect={onSelectAge}
        />

        <CategoryColumn
          selected={selectedCategory}
          onSelect={onSelectCategory}
        />

        <TopicColumn
          category={selectedCategory}
          selectedTopic={null}
          onSelect={() => {}}
        />
      </Box>

      {/* Stories - disabled for now */}
      {/* {stories.length > 0 && (
        <Box sx={{ mt: 5 }}>
          {stories.map((story: any) => (
            <Box
              key={story.id}
              onClick={() => onSelectStory?.(story)}
              sx={{
                p: 2,
                mb: 2,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 2,
                cursor: "pointer",
              }}
            >
              <strong>{story.title || "Story"}</strong>
            </Box>
          ))}
        </Box>
      )} */}
    </Box>
  );
}
