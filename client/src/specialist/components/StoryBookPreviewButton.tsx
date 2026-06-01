import { useMemo, useState } from "react";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import type { Story } from "../../types/story";
import { useSpecialistDeskUi } from "../../i18n/specialistDeskUi";
import { useSpecialistBookPreviewModel } from "../hooks/useSpecialistBookPreviewModel";
import ApprovalPreviewDialog from "./illustration/ApprovalPreviewDialog";

interface Props {
  story: Story;
}

export default function StoryBookPreviewButton({ story }: Props) {
  const desk = useSpecialistDeskUi();
  const model = useSpecialistBookPreviewModel(story);
  const [open, setOpen] = useState(false);

  const previewVariant = useMemo(() => {
    if (!model) return "work_in_progress" as const;
    const illustrated = model.pages.filter((p) => p.imageUrl).length;
    if (illustrated === 0) return "manuscript_only" as const;
    if (illustrated < model.pages.length) return "work_in_progress" as const;
    return "final" as const;
  }, [model]);

  const canPreview = !!model && story.status !== "archived";

  return (
    <>
      <Tooltip
        title={canPreview ? "" : desk.headerPreviewBookDisabledTooltip}
        placement="bottom"
      >
        <span>
          <Button
            size="small"
            variant="outlined"
            startIcon={<MenuBookOutlinedIcon sx={{ fontSize: "1rem !important" }} />}
            disabled={!canPreview}
            onClick={() => setOpen(true)}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.8125rem",
              borderColor: "divider",
              color: "text.primary",
            }}
          >
            {desk.headerPreviewBook}
          </Button>
        </span>
      </Tooltip>

      <ApprovalPreviewDialog
        open={open}
        onClose={() => setOpen(false)}
        model={model}
        variant={previewVariant}
      />
    </>
  );
}
