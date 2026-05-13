import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

interface Props {
  disabled: boolean;
  onOpen: () => void;
}

export default function PanelACta({ disabled, onOpen }: Props) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6">Illustration workspace</Typography>
          <Typography variant="body2" color="text.secondary">
            Generate a Visual Bible and a scene plan for every page. This runs in the
            background (about one minute) and does not create images yet.
          </Typography>
          <Button variant="contained" disabled={disabled} onClick={onOpen}>
            Open illustration workspace
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
