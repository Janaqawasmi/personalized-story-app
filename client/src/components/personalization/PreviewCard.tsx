import { Card, Box, Typography } from "@mui/material";
import { COLORS } from "../../theme";

type Props = {
  storyTitle: string;
};

export default function PreviewCard({ storyTitle }: Props) {
  return (
    <Card
      elevation={0}
      sx={{
        p: 3,
        mb: 4,
        borderRadius: 3,
        border: `1px solid ${COLORS.border}`,
        backgroundColor: COLORS.background,
      }}
    >
      <Typography
        fontWeight={700}
        mb={1}
        color={COLORS.primary}
      >
        Your story will include:
      </Typography>

      <Box component="ul" sx={{ pl: 2, m: 0 }}>
        <Typography component="li" variant="body2" mb={1}>
          The story <strong>{storyTitle}</strong>
        </Typography>

        <Typography component="li" variant="body2" mb={1}>
          Your child’s name and age woven naturally into the text
        </Typography>

        <Typography component="li" variant="body2" mb={1}>
          A gentle illustrated character inspired by your child
        </Typography>

        <Typography component="li" variant="body2">
          A calm, age-appropriate emotional message
        </Typography>
      </Box>
    </Card>
  );
}
