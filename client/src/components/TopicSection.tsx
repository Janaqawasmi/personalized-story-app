import { Box, Typography, Card, CardContent } from "@mui/material";
import { TOPIC_CATEGORIES } from "../data/categories";
import { COLORS } from "../theme";

type Props = {
  selectedTopic: string | null;
  onSelectTopic: (topicId: string) => void;
};

export default function TopicSection({ selectedTopic, onSelectTopic }: Props) {
  return (
    <Box mt={7}>
      <Typography variant="h5" textAlign="center" mb={3}>
        Choose a topic category
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
          gap: 3,
        }}
      >
        {TOPIC_CATEGORIES.map((t) => (
          <Card
            key={t.id}
            sx={{
              height: "100%",
              cursor: "pointer",
              transition: "0.3s",
              border: selectedTopic === t.id ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`,
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: 6,
              },
            }}
            onClick={() => onSelectTopic(t.id)}
          >
            <CardContent>
              <Typography variant="h6" color="primary">
                {t.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t.description}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {selectedTopic && (
        <Typography mt={3} textAlign="center" fontWeight={600}>
          Selected topic: {selectedTopic}
        </Typography>
      )}
    </Box>
  );
}
