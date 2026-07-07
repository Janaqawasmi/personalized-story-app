import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { PageCardViewModel } from "../../../hooks/useIllustrationWorkspaceState";
import { COLORS } from "../../../../theme";
import { DRAFT_B, FONTS } from "../../draftB/tokens";
import { ChipTone } from "../shared/ChipTone";

export function pageCardTitle(text: string): string {
  const line = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? text;
  const t = line.trim();
  return t.length > 48 ? `${t.slice(0, 45)}…` : t;
}

interface Props {
  pages: PageCardViewModel[];
}

/** Thumbnail grid of the approved illustrations — shared by the ready-to-publish
 *  state (rendered standalone) and the published GalleryPanel hero. */
export default function ApprovedIllustrationsGrid({ pages }: Props) {
  const approvedPages = pages.filter((p) => p.subStatus === "approved");
  const tiles = approvedPages.length > 0 ? approvedPages : pages;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(2, minmax(0, 1fr))",
          sm: "repeat(3, minmax(0, 1fr))",
          md: "repeat(4, minmax(0, 1fr))",
        },
        gap: 1.75,
      }}
    >
      {tiles.map((p) => (
        <Box
          key={p.pageNumber}
          sx={{
            bgcolor: COLORS.surface,
            border: `1px solid ${DRAFT_B.borderSoft}`,
            borderRadius: "10px",
            p: 1,
          }}
        >
          <Box
            sx={{
              position: "relative",
              width: "100%",
              aspectRatio: "1 / 1",
              borderRadius: "8px",
              overflow: "hidden",
              bgcolor: DRAFT_B.cream,
            }}
          >
            {p.imageUrl ? (
              <Box
                component="img"
                src={p.imageUrl}
                alt=""
                sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              <Box
                sx={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: DRAFT_B.inkMuted,
                  fontSize: 12,
                  fontFamily: FONTS.mono,
                }}
              >
                p.{p.pageNumber}
              </Box>
            )}
          </Box>
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.75}
            sx={{ pt: 1, px: 0.5, pb: 0.5, gap: 0.75 }}
          >
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: 12,
                color: DRAFT_B.inkMuted,
                flexShrink: 0,
              }}
            >
              p.{p.pageNumber}
            </Typography>
            <Typography
              sx={{
                flex: 1,
                minWidth: 0,
                fontFamily: `'Playfair Display', Georgia, serif`,
                fontWeight: 700,
                color: DRAFT_B.ink,
                fontSize: 13,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={pageCardTitle(p.text)}
            >
              {pageCardTitle(p.text)}
            </Typography>
            {p.subStatus === "approved" ? (
              <ChipTone
                tone="success"
                chipSize="sm"
                label="✓"
                sx={{ height: 22, "& .MuiChip-label": { px: 0.75 } }}
              />
            ) : null}
          </Stack>
        </Box>
      ))}
    </Box>
  );
}
