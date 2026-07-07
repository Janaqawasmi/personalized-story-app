import { Box, Button, Typography } from "@mui/material";
import { ChevronLeftOutlined, ChevronRightOutlined } from "@mui/icons-material";
import { COLORS } from "../../../theme";
import { useTranslation } from "../../../i18n/useTranslation";

interface AdminPaginationProps {
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  loading?: boolean;
  rangeLabel?: string;
}

/**
 * One shared prev/next control for every paginated admin list — works for
 * both server-cursor pagination (the page keeps a stack of cursors) and
 * simple client-side array pagination (the page keeps a page index); this
 * component only renders the controls, it doesn't care which.
 */
export default function AdminPagination({
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  loading = false,
  rangeLabel,
}: AdminPaginationProps) {
  const t = useTranslation();

  if (!hasPrev && !hasNext && !rangeLabel) return null;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        pt: 1.5,
        mt: 1,
        borderTop: `0.5px solid ${COLORS.border}`,
      }}
    >
      <Typography sx={{ fontSize: 11, color: COLORS.textSecondary }}>{rangeLabel ?? ""}</Typography>
      <Box sx={{ display: "flex", gap: 0.5 }}>
        <Button
          size="small"
          onClick={onPrev}
          disabled={!hasPrev || loading}
          startIcon={<ChevronLeftOutlined sx={{ fontSize: 16 }} />}
          sx={{ fontSize: 12, color: COLORS.textSecondary, minWidth: 0, px: 1 }}
        >
          {t("admin.pagination.prev")}
        </Button>
        <Button
          size="small"
          onClick={onNext}
          disabled={!hasNext || loading}
          endIcon={<ChevronRightOutlined sx={{ fontSize: 16 }} />}
          sx={{ fontSize: 12, color: COLORS.textSecondary, minWidth: 0, px: 1 }}
        >
          {t("admin.pagination.next")}
        </Button>
      </Box>
    </Box>
  );
}
