import {
    Card,
    Box,
    Typography,
    Button,
  } from "@mui/material";
  import { COLORS } from "../theme";
  
  type Props = {
    title: string;
    description?: string;
    imageUrl?: string;
    onClick: () => void;
  };
  
  export default function StoryGridCard({
    title,
    description,
    imageUrl,
    onClick,
  }: Props) {
    return (
      <Card
        elevation={0}
        sx={{
          backgroundColor: COLORS.surface,
          borderRadius: 3,
          border: `1px solid ${COLORS.border}`,
          overflow: "hidden",
          transition: "all 0.35s ease",
  
          "&:hover": {
            transform: "translateY(-6px)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
          },
        }}
      >
 {/* Image */}
<Box
  sx={{
    height: 260,
    backgroundColor: COLORS.background,
    backgroundImage: `url(${imageUrl || "/book-placeholder.png"})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  }}
/>

  
        {/* Content */}
        <Box p={2.5}>
          <Typography
            variant="subtitle1"
            fontWeight={700}
            gutterBottom
          >
            {title}
          </Typography>
  
          {description && (
            <Typography
              variant="body2"
              color={COLORS.textSecondary}
              mb={2}
            >
              {description}
            </Typography>
          )}
  
          <Button
            variant="contained"
            fullWidth
            onClick={onClick}
            sx={{
              backgroundColor: "#1C1C1C",
              color: "#FFFFFF",
              borderRadius: 2,
              fontWeight: 600,
  
              "&:hover": {
                backgroundColor: COLORS.primary,
              },
            }}
          >
            Personalize
          </Button>
        </Box>
      </Card>
    );
  }
  