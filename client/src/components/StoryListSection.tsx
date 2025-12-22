import { Box, Typography } from "@mui/material";
import StoryGridCard from "./StoryGridCard";

type Story = {
  id: string;
  title: string;
  shortDescription?: string;
  coverImage?: string;
};

type Props = {
  stories: Story[];
  onSelectStory: (storyId: string) => void;
};

export default function StoryListSection({
  stories,
  onSelectStory,
}: Props) {
  if (stories.length === 0) return null;

  return (
    <>
      <Typography
        variant="h5"
        fontWeight={700}
        mb={3}
      >
        Choose a story
      </Typography>

      <Box
        display="grid"
        gridTemplateColumns={{
          xs: "1fr",
          sm: "1fr 1fr",
          md: "1fr 1fr 1fr 1fr",
        }}
        gap={4}
      >
        {stories.map((story) => (
          <StoryGridCard
            key={story.id}
            title={story.title}
            description={story.shortDescription}
            imageUrl={story.coverImage}
            onClick={() => onSelectStory(story.id)}
          />
        ))}
      </Box>
    </>
  );
}
