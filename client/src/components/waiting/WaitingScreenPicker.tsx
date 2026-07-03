import { useEffect, useState } from "react";
import { Box, Chip, LinearProgress, Typography } from "@mui/material";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../i18n/context/useLanguage";
import { useTranslation } from "../../i18n/useTranslation";
import { BOOK_COLORS, BOOK_RADII } from "../book/bookTokens";
import SlidingPuzzleActivity from "./SlidingPuzzleActivity";
import ReadyToReadCarousel from "./ReadyToReadCarousel";

type WaitingChoice = "puzzle" | "prepare" | "none";

interface WaitingScreenPickerProps {
  statusText: string;
  /** Changing this re-triggers the status text's entrance animation without remounting the rest (puzzle/chip state survives). */
  statusKey?: string;
  /** 0-100; omit for indeterminate (no page-by-page progress is tracked today). */
  progress?: number;
  storyTheme?: string;
  coverImageUrl?: string;
}

export default function WaitingScreenPicker({
  statusText,
  statusKey,
  progress,
  storyTheme,
  coverImageUrl,
}: WaitingScreenPickerProps) {
  const { isRTL } = useLanguage();
  const t = useTranslation();
  const { currentUser } = useAuth();
  const [choice, setChoice] = useState<WaitingChoice>("none");
  const [loadedPref, setLoadedPref] = useState(false);

  // Load stored preference (pre-select, don't force).
  useEffect(() => {
    let cancelled = false;
    const uid = currentUser?.uid;
    if (!uid) {
      setLoadedPref(true);
      return;
    }
    void (async () => {
      try {
        const snap = await getDoc(doc(db, "caregivers", uid));
        const pref = snap.data()?.waitingScreenPreference as WaitingChoice | undefined;
        if (!cancelled && pref && pref !== "none") setChoice(pref);
      } catch (err) {
        console.warn("[WaitingScreenPicker] Failed to load preference:", err);
      } finally {
        if (!cancelled) setLoadedPref(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid]);

  const handleChoice = (next: WaitingChoice) => {
    const resolved = choice === next ? "none" : next; // tap again to deselect
    setChoice(resolved);
    const uid = currentUser?.uid;
    if (uid) {
      void setDoc(
        doc(db, "caregivers", uid),
        { waitingScreenPreference: resolved },
        { merge: true },
      ).catch((err) => {
        console.warn("[WaitingScreenPicker] Failed to save preference:", err);
      });
    }
  };

  return (
    <Box sx={{ direction: isRTL ? "rtl" : "ltr", textAlign: "center" }}>
      <Typography
        key={statusKey}
        sx={{
          mb: 2,
          color: BOOK_COLORS.cream,
          fontSize: 13,
          fontWeight: 500,
          animation: "stepEnter 0.4s ease forwards",
        }}
      >
        {statusText}
      </Typography>

      <LinearProgress
        variant={progress != null ? "determinate" : "indeterminate"}
        value={progress}
        sx={{
          maxWidth: 280,
          mx: "auto",
          mb: 3,
          height: 6,
          borderRadius: 3,
          backgroundColor: "rgba(253,245,238,0.16)",
          "& .MuiLinearProgress-bar": { backgroundColor: BOOK_COLORS.roseLight },
        }}
      />

      <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mb: 3, flexWrap: "wrap" }}>
        <Chip
          label={t("waitingScreen.playPuzzle")}
          onClick={() => handleChoice("puzzle")}
          variant={choice === "puzzle" ? "filled" : "outlined"}
          sx={{
            fontWeight: 600,
            borderRadius: BOOK_RADII.pill,
            backgroundColor: choice === "puzzle" ? BOOK_COLORS.roseLight : "transparent",
            color: BOOK_COLORS.cream,
            borderColor: BOOK_COLORS.roseLight,
          }}
        />
        <Chip
          label={t("waitingScreen.prepareToRead")}
          onClick={() => handleChoice("prepare")}
          variant={choice === "prepare" ? "filled" : "outlined"}
          sx={{
            fontWeight: 600,
            borderRadius: BOOK_RADII.pill,
            backgroundColor: choice === "prepare" ? BOOK_COLORS.roseLight : "transparent",
            color: BOOK_COLORS.cream,
            borderColor: BOOK_COLORS.roseLight,
          }}
        />
      </Box>

      {loadedPref && choice === "puzzle" && <SlidingPuzzleActivity coverImageUrl={coverImageUrl} />}
      {loadedPref && choice === "prepare" && <ReadyToReadCarousel theme={storyTheme} />}
    </Box>
  );
}
