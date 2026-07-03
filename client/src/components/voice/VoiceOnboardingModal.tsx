import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  FormControlLabel,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import ReplayIcon from "@mui/icons-material/Replay";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import SendIcon from "@mui/icons-material/Send";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { motion } from "framer-motion";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { BOOK_COLORS, BOOK_FONTS, BOOK_GRADIENTS } from "../book/bookTokens";
import { useTranslation } from "../../i18n/useTranslation";
import { API_BASE, getAuthHeadersForUpload } from "../../api/api";
import { auth, db } from "../../firebase";

const MAX_CLIPS = 3;
const MIN_RECORD_SECONDS = 5;
const MAX_RECORD_SECONDS = 45;
const VOICE_CONSENT_VERSION = "1.0";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (voiceId: string) => void;
  isRTL?: boolean;
};

type ClipState = {
  blob: Blob;
  durationSec: number;
};

type Step = "consent" | "record";

export default function VoiceOnboardingModal({
  open,
  onClose,
  onSuccess,
  isRTL = false,
}: Props) {
  const t = useTranslation();
  const [step, setStep] = useState<Step>("consent");
  const [consentGiven, setConsentGiven] = useState(false);
  const [clips, setClips] = useState<ClipState[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresVerification, setRequiresVerification] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const recordSecondsRef = useRef(0);

  const promptSentences = [
    t("voiceOnboarding.prompt1"),
    t("voiceOnboarding.prompt2"),
    t("voiceOnboarding.prompt3"),
  ];
  const currentPrompt = promptSentences[Math.min(clips.length, promptSentences.length - 1)];

  const cleanupStream = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    setRecordSeconds(0);
  }, []);

  useEffect(() => {
    if (!open) {
      cleanupStream();
      setClips([]);
      setError(null);
      setRequiresVerification(false);
      setUploading(false);
      setStep("consent");
      setConsentGiven(false);
    }
    return () => cleanupStream();
  }, [open, cleanupStream]);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const durationSec = recordSecondsRef.current;
        console.log("[VoiceOnboarding] recording stopped:", {
          blobSize: blob.size,
          durationSec,
          mimeType,
          chunkCount: chunksRef.current.length,
        });
        if (blob.size > 0 && durationSec >= MIN_RECORD_SECONDS) {
          setClips((prev) => [...prev, { blob, durationSec }].slice(0, MAX_CLIPS));
        } else if (durationSec < MIN_RECORD_SECONDS) {
          setError(t("voiceOnboarding.tooShort"));
        }
        cleanupStream();
      };

      recorder.start(200);
      setIsRecording(true);
      setRecordSeconds(0);
      recordSecondsRef.current = 0;
      timerRef.current = window.setInterval(() => {
        recordSecondsRef.current += 1;
        setRecordSeconds(recordSecondsRef.current);
        if (recordSecondsRef.current >= MAX_RECORD_SECONDS) {
          stopRecording();
        }
      }, 1000);
    } catch {
      setError(t("voiceOnboarding.micDenied"));
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      cleanupStream();
    }
  };

  const removeLastClip = () => {
    setClips((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleUpload = async () => {
    if (!clips.length) return;
    setUploading(true);
    setError(null);
    try {
      await auth.authStateReady();
      if (!auth.currentUser) {
        setError(t("voiceOnboarding.notLoggedIn"));
        return;
      }

      const formData = new FormData();
      clips.forEach((clip, i) => {
        console.log("[VoiceOnboarding] upload clip:", {
          index: i,
          blobSize: clip.blob.size,
          durationSec: clip.durationSec,
          blobType: clip.blob.type,
        });
        formData.append("files", clip.blob, `sample_${i}.webm`);
      });
      const totalBytes = clips.reduce((sum, c) => sum + c.blob.size, 0);
      const totalDurationSec = clips.reduce((sum, c) => sum + c.durationSec, 0);
      console.log("[VoiceOnboarding] upload totals:", { totalBytes, totalDurationSec, clipCount: clips.length });

      const res = await fetch(`${API_BASE}/api/caregiver/voice/clone`, {
        method: "POST",
        headers: await getAuthHeadersForUpload(),
        body: formData,
      });

      if (!res.ok) {
        let detail = "";
        try {
          const body = await res.json();
          detail =
            (typeof body?.error?.message === "string" && body.error.message) ||
            (typeof body?.details === "string" && body.details) ||
            JSON.stringify(body);
        } catch {
          detail = await res.text().catch(() => "");
        }
        console.error("[VoiceOnboarding] clone upload failed:", res.status, detail);
        throw new Error(
          detail
            ? `Voice clone upload failed (${res.status}): ${detail}`
            : `Voice clone upload failed (${res.status})`,
        );
      }

      const body = await res.json();
      const data = body.data ?? body;
      const voiceId = data.voiceId as string;
      setRequiresVerification(Boolean(data.requiresVerification));

      try {
        await updateDoc(doc(db, "caregivers", auth.currentUser.uid), {
          voiceConsentTimestamp: serverTimestamp(),
          voiceConsentVersion: VOICE_CONSENT_VERSION,
        });
      } catch (consentErr) {
        console.warn("[VoiceOnboarding] failed to record voice consent timestamp:", consentErr);
      }

      onSuccess(voiceId);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("voiceOnboarding.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const canFinish = clips.length >= 1 && !isRecording && !uploading;

  return (
    <Dialog
      open={open}
      onClose={uploading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: `linear-gradient(180deg, ${BOOK_COLORS.parchmentLight} 0%, ${BOOK_COLORS.parchmentDark} 100%)`,
          direction: isRTL ? "rtl" : "ltr",
        },
      }}
    >
      {step === "consent" ? (
        <>
          <DialogContent sx={{ px: 3, pt: 4, pb: 1, textAlign: "center", position: "relative" }}>
            <IconButton
              onClick={onClose}
              aria-label={t("voiceOnboarding.close")}
              sx={{ position: "absolute", top: 8, insetInlineEnd: 8 }}
            >
              <CloseIcon />
            </IconButton>

            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                backgroundColor: "#E6F1FB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 2,
              }}
            >
              <ShieldOutlinedIcon sx={{ color: "#185FA5", fontSize: 32 }} />
            </Box>

            <Typography
              sx={{
                fontFamily: BOOK_FONTS.display,
                fontSize: "1.4rem",
                fontWeight: 600,
                color: BOOK_COLORS.ink,
                mb: 1,
              }}
            >
              Your voice, your privacy
            </Typography>

            <Typography
              sx={{
                fontSize: "0.9rem",
                color: BOOK_COLORS.inkSoft,
                mb: 3,
                fontFamily: isRTL ? BOOK_FONTS.bodyRtl : BOOK_FONTS.bodyLtr,
              }}
            >
              Before you record, here's what happens with your voice data.
            </Typography>

            <Box
              sx={{
                textAlign: isRTL ? "right" : "left",
                borderRadius: 2,
                p: 2,
                backgroundColor: BOOK_COLORS.parchmentLight,
                border: "1px solid rgba(130,77,92,0.2)",
                mb: 3,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 1.5 }}>
                <CloseIcon sx={{ color: BOOK_COLORS.rose, fontSize: 20, mt: "2px", flexShrink: 0 }} />
                <Typography sx={{ fontSize: "0.9rem", color: BOOK_COLORS.ink }}>
                  Your recording is not saved on DAMMAH's servers
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 1.5 }}>
                <SendIcon sx={{ color: BOOK_COLORS.rose, fontSize: 20, mt: "2px", flexShrink: 0 }} />
                <Typography sx={{ fontSize: "0.9rem", color: BOOK_COLORS.ink }}>
                  It's sent to ElevenLabs (a third-party AI voice service) to create a voice model
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                <DeleteOutlineIcon sx={{ color: BOOK_COLORS.rose, fontSize: 20, mt: "2px", flexShrink: 0 }} />
                <Typography sx={{ fontSize: "0.9rem", color: BOOK_COLORS.ink }}>
                  You can delete your voice model at any time from your profile
                </Typography>
              </Box>
            </Box>

            <FormControlLabel
              sx={{ alignItems: "flex-start", mx: 0, mb: 1, textAlign: isRTL ? "right" : "left" }}
              control={
                <Checkbox
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  sx={{
                    color: BOOK_COLORS.rose,
                    "&.Mui-checked": { color: BOOK_COLORS.rose },
                  }}
                />
              }
              label={
                <Typography sx={{ fontSize: "0.85rem", color: BOOK_COLORS.ink, mt: "10px" }}>
                  I give consent for my voice to be processed by ElevenLabs to enable narration on DAMMAH
                </Typography>
              }
            />
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3, flexDirection: "column", gap: 1 }}>
            <Button
              fullWidth
              variant="contained"
              disabled={!consentGiven}
              onClick={() => setStep("record")}
              sx={{
                background: BOOK_GRADIENTS.ctaPrimary,
                "&:hover": { background: BOOK_GRADIENTS.ctaPrimaryHover },
              }}
            >
              Accept and record
            </Button>
            <Button fullWidth variant="text" onClick={onClose} sx={{ color: BOOK_COLORS.inkMuted }}>
              Skip — use default voice
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 2.5,
              pt: 2,
            }}
          >
            <Typography
              sx={{
                fontFamily: BOOK_FONTS.display,
                fontSize: "1.25rem",
                color: BOOK_COLORS.rose,
                fontWeight: 600,
              }}
            >
              {t("voiceOnboarding.title")}
            </Typography>
            <IconButton onClick={onClose} disabled={uploading} aria-label={t("voiceOnboarding.close")}>
              <CloseIcon />
            </IconButton>
          </Box>

          <DialogContent sx={{ px: 2.5, pb: 1 }}>
            <Typography
              sx={{
                fontSize: "0.9rem",
                color: BOOK_COLORS.inkSoft,
                mb: 2,
                fontFamily: isRTL ? BOOK_FONTS.bodyRtl : BOOK_FONTS.bodyLtr,
              }}
            >
              {t("voiceOnboarding.subtitle")}
            </Typography>

            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: `1px solid rgba(130,77,92,0.2)`,
                backgroundColor: "rgba(255,255,255,0.55)",
                mb: 2,
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: BOOK_COLORS.rose,
                  mb: 1,
                  fontFamily: BOOK_FONTS.display,
                }}
              >
                {t("voiceOnboarding.readThis")}
              </Typography>
              <Typography
                sx={{
                  fontSize: "1.05rem",
                  lineHeight: 1.7,
                  color: BOOK_COLORS.ink,
                  fontFamily: isRTL ? BOOK_FONTS.bodyRtl : BOOK_FONTS.bodyLtr,
                  fontStyle: isRTL ? "normal" : "italic",
                }}
              >
                {currentPrompt}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, py: 2, minHeight: 120 }}>
              {isRecording ? (
                <motion.div
                  key="recording"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <Box sx={{ textAlign: "center" }}>
                    <Box
                      sx={{
                        width: 72,
                        height: 72,
                        borderRadius: "50%",
                        background: BOOK_GRADIENTS.ctaPrimary,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mx: "auto",
                        mb: 1,
                        boxShadow: "0 0 0 8px rgba(130,77,92,0.15)",
                        animation: "pulse-ring 1.2s ease-in-out infinite",
                        "@keyframes pulse-ring": {
                          "0%, 100%": { boxShadow: "0 0 0 8px rgba(130,77,92,0.15)" },
                          "50%": { boxShadow: "0 0 0 14px rgba(130,77,92,0.08)" },
                        },
                      }}
                    >
                      <MicIcon sx={{ color: BOOK_COLORS.cream, fontSize: 32 }} />
                    </Box>
                    <Typography sx={{ fontVariantNumeric: "tabular-nums", color: BOOK_COLORS.rose }}>
                      {recordSeconds}s / {MAX_RECORD_SECONDS}s
                    </Typography>
                  </Box>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <Typography sx={{ fontSize: "0.85rem", color: BOOK_COLORS.inkMuted, textAlign: "center" }}>
                    {t("voiceOnboarding.clipsRecorded", { count: clips.length, max: MAX_CLIPS })}
                  </Typography>
                </motion.div>
              )}
            </Box>

            {error ? (
              <Typography sx={{ color: "error.main", fontSize: "0.85rem", mb: 1, textAlign: "center" }}>
                {error}
              </Typography>
            ) : null}

            {requiresVerification ? (
              <Typography sx={{ fontSize: "0.8rem", color: BOOK_COLORS.inkMuted, textAlign: "center" }}>
                {t("voiceOnboarding.verificationNote")}
              </Typography>
            ) : null}
          </DialogContent>

          <DialogActions sx={{ px: 2.5, pb: 2.5, flexWrap: "wrap", gap: 1 }}>
            {isRecording ? (
              <Button
                variant="contained"
                startIcon={<StopIcon />}
                onClick={stopRecording}
                sx={{
                  background: BOOK_GRADIENTS.ctaPrimary,
                  "&:hover": { background: BOOK_GRADIENTS.ctaPrimaryHover },
                }}
              >
                {t("voiceOnboarding.stopRecording")}
              </Button>
            ) : (
              <>
                {clips.length < MAX_CLIPS ? (
                  <Button
                    variant="outlined"
                    startIcon={<MicIcon />}
                    onClick={startRecording}
                    disabled={uploading}
                    sx={{ borderColor: BOOK_COLORS.rose, color: BOOK_COLORS.rose }}
                  >
                    {clips.length === 0
                      ? t("voiceOnboarding.startRecording")
                      : t("voiceOnboarding.recordAnother")}
                  </Button>
                ) : null}
                {clips.length > 0 ? (
                  <Button
                    variant="text"
                    startIcon={<ReplayIcon />}
                    onClick={removeLastClip}
                    disabled={uploading}
                    sx={{ color: BOOK_COLORS.inkMuted }}
                  >
                    {t("voiceOnboarding.redoLast")}
                  </Button>
                ) : null}
                <Box sx={{ flex: 1 }} />
                <Button onClick={onClose} disabled={uploading} sx={{ color: BOOK_COLORS.inkMuted }}>
                  {t("voiceOnboarding.cancel")}
                </Button>
                <Button
                  variant="contained"
                  disabled={!canFinish}
                  onClick={handleUpload}
                  startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : undefined}
                  sx={{
                    background: BOOK_GRADIENTS.ctaPrimary,
                    "&:hover": { background: BOOK_GRADIENTS.ctaPrimaryHover },
                  }}
                >
                  {uploading ? t("voiceOnboarding.saving") : t("voiceOnboarding.finish")}
                </Button>
              </>
            )}
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
