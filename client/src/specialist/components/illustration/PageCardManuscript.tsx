import Typography from "@mui/material/Typography";

interface Props {
  text: string;
}

export default function PageCardManuscript({ text }: Props) {
  return (
    <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
      {text}
    </Typography>
  );
}
