import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";

interface Props {
  error: string;
  onRetry: () => void;
}

export default function ErrorPanel({ error, onRetry }: Props) {
  return (
    <Card variant="outlined" sx={{ borderColor: "error.main" }}>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6">Workspace could not open</Typography>
          <Typography variant="body2" color="text.secondary">
            {error}
          </Typography>
          <Button variant="outlined" onClick={onRetry}>
            Try again
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
