import {
  Card,
  CardActionArea,
  Box,
  Typography,
  Chip,
} from "@mui/material";
import { COLORS } from "../theme";
import { formatAgeGroupLabel } from "../data/categories";

type Props = {
  title: string;
  description?: string;
  ageGroup: string;
  topicKey: string;
  onClick: () => void;
};

export default function StoryCard({
  title,
  description,
  ageGroup,
  topicKey,
  onClick,
}: Props) {
  return (
    <Card
      elevation={0}
      sx={{
        backgroundColor: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 3,
        transition: "all 0.35s ease",
        overflow: "hidden",

        "&:hover": {
          transform: "translateY(-6px) scale(1.01)",
          boxShadow: `0 12px 30px rgba(97, 120, 145, 0.25)`,
          borderColor: COLORS.primary,
        },
      }}
    >
      <CardActionArea onClick={onClick} sx={{ p: 3 }}>
        <Box display="flex" flexDirection="column" gap={1.5}>
          {/* Title */}
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: COLORS.primary,
            }}
          >
            {title}
          </Typography>

          {/* Optional short description */}
          {description && (
            <Typography
              variant="body2"
              color={COLORS.textSecondary}
            >
              {description}
            </Typography>
          )}

          {/* Tags */}
          <Box display="flex" gap={1} mt={1}>
            <Chip
              label={formatAgeGroupLabel(ageGroup)}
              size="small"
              sx={{
                backgroundColor: COLORS.background,
                color: COLORS.primary,
                fontWeight: 600,
              }}
            />

            <Chip
              label={topicKey}
              size="small"
              sx={{
                backgroundColor: COLORS.secondary + "22",
                color: COLORS.secondary,
                fontWeight: 600,
              }}
            />
          </Box>
        </Box>
      </CardActionArea>
    </Card>
  );
}
