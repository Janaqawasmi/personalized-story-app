import { Box, Typography, Card, CardActionArea } from "@mui/material";
import { useState } from "react";
import { COLORS } from "../../theme";

const styles = [
  { key: "watercolor", label: "Watercolor 🎨" },
  { key: "cartoon", label: "Cartoon 😊" },
  { key: "dreamy", label: "Dreamy ✨" },
];

export default function StyleSelector() {
  const [selected, setSelected] = useState("watercolor");

  return (
    <Box mt={6}>
      <Typography variant="h6" mb={2}>
        Choose a story style
      </Typography>

      <Box
        display="grid"
        gridTemplateColumns={{
          xs: "1fr",
          sm: "1fr 1fr 1fr",
        }}
        gap={2}
      >
        {styles.map((style) => (
          <Card
            key={style.key}
            sx={{
              border:
                selected === style.key
                  ? `2px solid ${COLORS.primary}`
                  : `1px solid ${COLORS.border}`,
            }}
          >
            <CardActionArea onClick={() => setSelected(style.key)}>
              <Box p={2} textAlign="center">
                <Typography>{style.label}</Typography>
              </Box>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
