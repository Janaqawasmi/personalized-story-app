import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

interface Props {
  message: string;
}

export default function LoadingPanel({ message }: Props) {
  return (
    <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
      <CircularProgress />
      <Typography variant="body1" color="text.secondary" textAlign="center">
        {message}
      </Typography>
    </Stack>
  );
}
