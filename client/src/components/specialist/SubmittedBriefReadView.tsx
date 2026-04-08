// client/src/components/specialist/SubmittedBriefReadView.tsx
//
// Read-only, sectioned summary of a submitted CompleteBrief for specialist review.

import React from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { COLORS } from "../../theme";
import { useStoryBriefUi } from "../../i18n/storyBriefUi";
import type { SpecialistUi } from "../../i18n/specialistUi.types";
import { getSubmitGateTitleForDisplay } from "../../validation/briefSubmitGate";
import {
  PERSONALIZATION_DEFAULT,
  STORY_TYPE_DESCRIPTIONS,
  type CompleteBrief,
  type StoryType,
} from "../../types/storyBrief";

const sectionPaperSx = {
  p: 2.5,
  borderRadius: 2,
  border: `1px solid ${COLORS.border}`,
  bgcolor: COLORS.surface,
};

function FieldBlock({
  label,
  value,
  emptyLabel,
}: {
  label: string;
  value: string | undefined | null;
  emptyLabel: string;
}) {
  const text = value?.trim();
  return (
    <Box sx={{ mb: 2.25, "&:last-child": { mb: 0 } }}>
      <Typography
        variant="caption"
        color="text.secondary"
        component="p"
        sx={{ fontWeight: 700, letterSpacing: "0.02em", mb: 0.75 }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: text ? COLORS.textPrimary : "text.secondary",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          lineHeight: 1.65,
        }}
      >
        {text || emptyLabel}
      </Typography>
    </Box>
  );
}

export interface SubmittedBriefReadViewProps {
  brief: CompleteBrief;
  emptyLabel: string;
  specialistUi: SpecialistUi;
}

export default function SubmittedBriefReadView({ brief, emptyLabel, specialistUi }: SubmittedBriefReadViewProps) {
  const ui = useStoryBriefUi();
  const st = brief.storyType;
  const s1 = brief.section1;
  const s2 = brief.section2;
  const s3 = brief.section3;
  const s4 = brief.section4;
  const s5 = brief.section5;

  const personalized = (s4.personalization ?? PERSONALIZATION_DEFAULT) === "yes";

  return (
    <Stack spacing={2.5} sx={{ mt: 0 }}>
      {brief.acknowledgedWarnings && brief.acknowledgedWarnings.length > 0 && (
        <AlertToneBox variant="note" title={specialistUi.reviewAcknowledgedTitle}>
          <Stack component="ul" sx={{ m: 0, pl: 2.5, mb: 0 }}>
            {brief.acknowledgedWarnings.map((id) => (
              <Typography key={id} component="li" variant="body2" sx={{ mb: 0.5 }}>
                {getSubmitGateTitleForDisplay(id) ?? id}
              </Typography>
            ))}
          </Stack>
        </AlertToneBox>
      )}

      {/* Pre-brief: story type */}
      <Paper elevation={0} sx={sectionPaperSx}>
        <Typography
          variant="overline"
          sx={{ letterSpacing: "0.12em", fontWeight: 700, color: COLORS.primary, display: "block", mb: 1 }}
        >
          {ui.preBriefOverline}
        </Typography>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 800, mb: 1, letterSpacing: "-0.02em" }}>
          {ui.preBriefTitle}
        </Typography>
        {st && st in ui.STORY_TYPE_LABELS ? (
          <>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: COLORS.textPrimary, mb: 0.75 }}>
              {ui.STORY_TYPE_LABELS[st as StoryType]}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
              {STORY_TYPE_DESCRIPTIONS[st as StoryType]}
            </Typography>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {emptyLabel}
          </Typography>
        )}
      </Paper>

      {/* Section 1 */}
      <Paper elevation={0} sx={sectionPaperSx}>
        <Typography variant="overline" sx={{ letterSpacing: "0.12em", fontWeight: 700, color: COLORS.primary, display: "block", mb: 0.75 }}>
          {ui.s1Overline}
        </Typography>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 800, mb: 2, letterSpacing: "-0.02em" }}>
          {ui.s1Title}
        </Typography>
        <FieldBlock label={ui.s1Field11} value={s1.ageRange ? ui.AGE_RANGE_LABELS[s1.ageRange] : undefined} emptyLabel={emptyLabel} />
        <FieldBlock
          label={ui.s1Field12}
          value={s1.peakIntensity ? ui.PEAK_INTENSITY_LABELS[s1.peakIntensity] : undefined}
          emptyLabel={emptyLabel}
        />
        <FieldBlock
          label={ui.s1Field13}
          value={s1.storyLength ? ui.STORY_LENGTH_LABELS[s1.storyLength] : undefined}
          emptyLabel={emptyLabel}
        />
      </Paper>

      {/* Section 2 */}
      <Paper elevation={0} sx={sectionPaperSx}>
        <Typography variant="overline" sx={{ letterSpacing: "0.12em", fontWeight: 700, color: COLORS.primary, display: "block", mb: 0.75 }}>
          {ui.s2Overline}
        </Typography>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 800, mb: 2, letterSpacing: "-0.02em" }}>
          {ui.s2Title}
        </Typography>
        <FieldBlock label={ui.s2Field21} value={s2.population} emptyLabel={emptyLabel} />
        <FieldBlock
          label={st && st in ui.TRIGGER_LABELS ? ui.TRIGGER_LABELS[st as StoryType]! : ui.fallbackTriggerLabel}
          value={s2.trigger}
          emptyLabel={emptyLabel}
        />
        <FieldBlock
          label={`${ui.s2Field23} — ${ui.s2IntentionFeelPrefix}`}
          value={s2.intentionFeel}
          emptyLabel={emptyLabel}
        />
        <FieldBlock label={`${ui.s2Field23} — ${ui.s2IntentionBecausePrefix}`} value={s2.intentionBecause} emptyLabel={emptyLabel} />
        <FieldBlock label={ui.s2Field24} value={s2.creativeVision} emptyLabel={emptyLabel} />
        <FieldBlock label={ui.s2Field25} value={s2.oneTrueThing} emptyLabel={emptyLabel} />
      </Paper>

      {/* Section 3 */}
      <Paper elevation={0} sx={sectionPaperSx}>
        <Typography variant="overline" sx={{ letterSpacing: "0.12em", fontWeight: 700, color: COLORS.primary, display: "block", mb: 0.75 }}>
          {ui.s3Overline}
        </Typography>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 800, mb: 2, letterSpacing: "-0.02em" }}>
          {ui.s3Title}
        </Typography>
        <FieldBlock
          label={ui.s3Field31}
          value={s3.primaryApproach ? ui.THERAPEUTIC_APPROACH_LABELS[s3.primaryApproach] : undefined}
          emptyLabel={emptyLabel}
        />
        <FieldBlock
          label={ui.s3Field32}
          value={
            s3.supportingApproach != null
              ? ui.THERAPEUTIC_APPROACH_LABELS[s3.supportingApproach]
              : undefined
          }
          emptyLabel={emptyLabel}
        />
        <FieldBlock
          label={ui.s3Field33}
          value={s3.shameDimension ? ui.SHAME_DIMENSION_LABELS[s3.shameDimension] : undefined}
          emptyLabel={emptyLabel}
        />
        <Box sx={{ mb: 2.25 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 0.75 }}>
            {ui.s3Field34}
          </Typography>
          {s3.somaticExpressions && s3.somaticExpressions.length > 0 ? (
            <Stack component="ul" sx={{ m: 0, pl: 2.5 }}>
              {s3.somaticExpressions.map((ex) => (
                <Typography key={ex} component="li" variant="body2" sx={{ lineHeight: 1.65 }}>
                  {ui.SOMATIC_EXPRESSION_LABELS[ex]}
                </Typography>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {emptyLabel}
            </Typography>
          )}
          {s3.somaticOther?.trim() ? (
            <Typography variant="body2" sx={{ mt: 1, whiteSpace: "pre-wrap" }}>
              {ui.s3SomaticOtherLabel}: {s3.somaticOther}
            </Typography>
          ) : null}
        </Box>
        <FieldBlock
          label={ui.s3Field35}
          value={s3.copingTool ? ui.COPING_TOOL_LABELS[s3.copingTool] : undefined}
          emptyLabel={emptyLabel}
        />
        <FieldBlock
          label={ui.s3Field36}
          value={s3.resolutionCompleteness ? ui.RESOLUTION_LABELS[s3.resolutionCompleteness] : undefined}
          emptyLabel={emptyLabel}
        />
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 0.75 }}>
            {ui.s3Field37}
          </Typography>
          {s3.mustNeverList && s3.mustNeverList.length > 0 ? (
            <Stack component="ul" sx={{ m: 0, pl: 2.5 }}>
              {s3.mustNeverList.map((line, i) => (
                <Typography key={i} component="li" variant="body2" sx={{ lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                  {line}
                </Typography>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {emptyLabel}
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Section 4 */}
      <Paper elevation={0} sx={sectionPaperSx}>
        <Typography variant="overline" sx={{ letterSpacing: "0.12em", fontWeight: 700, color: COLORS.primary, display: "block", mb: 0.75 }}>
          {ui.s4Overline}
        </Typography>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 800, mb: 2, letterSpacing: "-0.02em" }}>
          {ui.s4Title}
        </Typography>
        <FieldBlock
          label={ui.s4Field40}
          value={
            s4.personalization === "yes"
              ? ui.s4PersonalizationYes
              : s4.personalization === "no"
                ? ui.s4PersonalizationNo
                : undefined
          }
          emptyLabel={emptyLabel}
        />
        {!personalized && (
          <FieldBlock
            label={ui.s4Field41}
            value={s4.protagonistGender ? ui.PROTAGONIST_GENDER_LABELS[s4.protagonistGender] : undefined}
            emptyLabel={emptyLabel}
          />
        )}
        <FieldBlock
          label={ui.s4Field42}
          value={s4.protagonistType ? ui.PROTAGONIST_TYPE_LABELS[s4.protagonistType] : undefined}
          emptyLabel={emptyLabel}
        />
        {!personalized && (
          <FieldBlock
            label={ui.s4Field43}
            value={s4.protagonistAgeRelative ? ui.PROTAGONIST_AGE_RELATIVE_LABELS[s4.protagonistAgeRelative] : undefined}
            emptyLabel={emptyLabel}
          />
        )}
        <FieldBlock
          label={ui.s4Field44}
          value={s4.caregiverPresence ? ui.CAREGIVER_PRESENCE_LABELS[s4.caregiverPresence] : undefined}
          emptyLabel={emptyLabel}
        />
        <FieldBlock
          label={ui.s4Field45}
          value={s4.narrativeDistance ? ui.NARRATIVE_DISTANCE_LABELS[s4.narrativeDistance] : undefined}
          emptyLabel={emptyLabel}
        />
        {s4.narrativeDistance === "parallel" && (
          <FieldBlock label={ui.s4ParallelTitle} value={s4.parallelChallenge} emptyLabel={emptyLabel} />
        )}
        <Box sx={{ mb: 2.25 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 0.75 }}>
            {ui.s4Field46}
          </Typography>
          {s4.supportingCharacters && s4.supportingCharacters.length > 0 ? (
            <Stack spacing={1.25}>
              {s4.supportingCharacters.map((ch) => (
                <Box key={ch}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {ui.SUPPORTING_CHARACTER_LABELS[ch]}
                  </Typography>
                  {s4.characterRoleNotes?.[ch]?.trim() ? (
                    <Typography variant="body2" color="text.secondary" sx={{ pl: 0, mt: 0.5, whiteSpace: "pre-wrap" }}>
                      {s4.characterRoleNotes[ch]}
                    </Typography>
                  ) : null}
                </Box>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {emptyLabel}
            </Typography>
          )}
        </Box>
        <FieldBlock label={ui.s4Field47} value={s4.characterNotes} emptyLabel={emptyLabel} />
      </Paper>

      {/* Section 5 */}
      <Paper elevation={0} sx={sectionPaperSx}>
        <Typography variant="overline" sx={{ letterSpacing: "0.12em", fontWeight: 700, color: COLORS.primary, display: "block", mb: 0.75 }}>
          {ui.s5Overline}
        </Typography>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 800, mb: 2, letterSpacing: "-0.02em" }}>
          {ui.s5Title}
        </Typography>
        {personalized ? (
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
            {ui.s5IntroOn}
          </Typography>
        ) : (
          <FieldBlock label={ui.s5Field52} value={s5.whyNot} emptyLabel={emptyLabel} />
        )}
      </Paper>
    </Stack>
  );
}

function AlertToneBox({
  variant,
  title,
  children,
}: {
  variant: "note";
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: `1px solid ${COLORS.border}`,
        bgcolor: variant === "note" ? "rgba(97, 120, 145, 0.08)" : COLORS.surface,
      }}
    >
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: COLORS.textPrimary }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}
