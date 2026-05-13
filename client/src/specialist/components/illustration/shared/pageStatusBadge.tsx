import Check from "@mui/icons-material/Check";
import CircularProgress from "@mui/material/CircularProgress";
import type { SpecialistDeskUi } from "../../../../i18n/specialistDeskUi.types";
import type { IllustrationPageStatus } from "../../../../types/illustration";
import { ChipTone } from "./ChipTone";

/** Labels required to render the five per-page illustration sub-status chips. */
export type PageStatusDeskLabels = Pick<
  SpecialistDeskUi,
  | "illStatusPlanOnly"
  | "illStatusGenerating"
  | "illStatusAwaiting"
  | "illStatusApproved"
  | "illStatusRejected"
>;

export interface PageStatusBadgeProps {
  status: IllustrationPageStatus;
  desk: PageStatusDeskLabels;
  chipSize?: "sm" | "md";
}

/**
 * Status chip for one manuscript page — maps `IllustrationPageStatus` to tone + copy.
 * Labels come from `useSpecialistDeskUi` (illStatus* keys).
 */
export function PageStatusBadge({
  status,
  desk,
  chipSize = "sm",
}: PageStatusBadgeProps) {
  switch (status) {
    case "plan_only":
      return (
        <ChipTone
          tone="neutral"
          chipSize={chipSize}
          label={desk.illStatusPlanOnly}
          aria-label={desk.illStatusPlanOnly}
        />
      );
    case "generating_image":
      return (
        <ChipTone
          tone="info"
          chipSize={chipSize}
          icon={
            <CircularProgress
              size={11}
              thickness={5}
              sx={{ color: "inherit" }}
              aria-hidden
            />
          }
          label={desk.illStatusGenerating}
          aria-label={desk.illStatusGenerating}
        />
      );
    case "awaiting_review":
      return (
        <ChipTone
          tone="warning"
          chipSize={chipSize}
          label={desk.illStatusAwaiting}
          aria-label={desk.illStatusAwaiting}
        />
      );
    case "approved":
      return (
        <ChipTone
          tone="success"
          chipSize={chipSize}
          icon={<Check sx={{ fontSize: 14 }} aria-hidden />}
          label={desk.illStatusApproved}
          aria-label={desk.illStatusApproved}
        />
      );
    case "needs_revision":
      return (
        <ChipTone
          tone="error"
          chipSize={chipSize}
          label={desk.illStatusRejected}
          aria-label={desk.illStatusRejected}
        />
      );
  }
}
