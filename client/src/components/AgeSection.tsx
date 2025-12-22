import { Box, Button, Typography, Stack } from "@mui/material";
import { AGE_GROUPS } from "../data/categories";

type Props = {
  selectedAge: string | null;
  onSelectAge: (ageId: string) => void;
};

export default function AgeSection({ selectedAge, onSelectAge }: Props) {
  return (
    <Box textAlign="center" mt={6}>
      <Typography variant="h4" mb={2}>
        Let's create a story for your child
      </Typography>

      <Typography variant="subtitle1" mb={3}>
        How old is your child?
      </Typography>

      <Stack spacing={2} maxWidth={520} mx="auto">
        {AGE_GROUPS.map((age) => (
          <Button
            key={age.id}
            variant={selectedAge === age.id ? "contained" : "outlined"}
            onClick={() => onSelectAge(age.id)}
            sx={{ py: 2, fontWeight: 700 }}
          >
            {age.label}
          </Button>
        ))}
      </Stack>

      {selectedAge && (
        <Typography mt={3} color="primary" fontWeight={600}>
          Selected age group: {selectedAge}
        </Typography>
      )}
    </Box>
  );
}
