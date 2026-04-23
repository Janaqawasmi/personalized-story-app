import { Box, CircularProgress, Typography } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { COLORS } from "../../theme";
import { useTranslation } from "../../i18n/useTranslation";
import { useLanguage } from "../../i18n/context/useLanguage";
import { useLangNavigate } from "../../i18n/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { SuggestStoryForm } from "./components/SuggestStoryForm";
import { SuggestStorySuccess } from "./components/SuggestStorySuccess";

type ViewState = "form" | "success";

export default function SuggestStoryPage() {
  const t = useTranslation();
  const { direction } = useLanguage();
  const navigate = useLangNavigate();
  const location = useLocation();
  const { lang } = useParams<{ lang: string }>();
  const { currentUser, loading } = useAuth();

  const [view, setView] = useState<ViewState>("form");
  const [idToken, setIdToken] = useState<string>("");
  const [roleStatus, setRoleStatus] = useState<"loading" | "allowed" | "not_allowed">(
    "loading"
  );

  const loginPath = useMemo(() => {
    const l = lang ?? "he";
    return `/${l}/login?returnTo=/${l}/suggest`;
  }, [lang]);

  // Workaround for a framer-motion JSX typing issue under this repo's TS/React versions.
  const AnimatePresenceCompat = AnimatePresence as unknown as (props: any) => any;

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (!currentUser) return;
      try {
        const tokenResult = await currentUser.getIdTokenResult(true);
        const role = tokenResult.claims.role;
        if (cancelled) return;
        if (role === "caregiver" || role === "specialist" || role === "admin") {
          setRoleStatus("allowed");
        } else {
          setRoleStatus("not_allowed");
        }

        const token = await currentUser.getIdToken();
        if (cancelled) return;
        setIdToken(token);
      } catch (err) {
        if (cancelled) return;
        setRoleStatus("not_allowed");
        setIdToken("");
      }
    }

    if (currentUser) {
      setRoleStatus("loading");
      void hydrate();
    }

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          direction,
        }}
      >
        <CircularProgress sx={{ color: COLORS.secondary }} />
      </Box>
    );
  }

  if (!currentUser) {
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  if (roleStatus === "loading") {
    return (
      <Box
        sx={{
          minHeight: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          direction,
        }}
      >
        <CircularProgress sx={{ color: COLORS.secondary }} />
      </Box>
    );
  }

  if (roleStatus === "not_allowed") {
    return (
      <Box
        sx={{
          minHeight: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 3,
          direction,
          backgroundColor: COLORS.background,
        }}
      >
        <Typography sx={{ color: COLORS.textPrimary, fontWeight: 600 }}>
          {t("suggest.not_caregiver")}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: COLORS.background,
        px: { xs: 2, sm: 3 },
        py: { xs: 5, sm: 7 },
        direction,
      }}
    >
      <AnimatePresenceCompat mode="wait">
        {view === "form" ? (
          <Box
            key="form"
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            sx={{ maxWidth: 560, mx: "auto" }}
          >
            {/* Hero */}
            <Box sx={{ textAlign: "center", mb: 3.25 }}>
              <Typography sx={{ fontSize: 18, mb: 1.25 }} aria-hidden>
                ✨
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontWeight: 700,
                  color: COLORS.textPrimary,
                  mb: 1,
                  fontSize: { xs: 30, sm: 34 },
                }}
              >
                {t("suggest.hero.title")}
              </Typography>
              <Typography sx={{ color: COLORS.textSecondary, mb: 2 }}>
                {t("suggest.hero.subtitle")}
              </Typography>

              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  px: 2,
                  py: 0.75,
                  borderRadius: 999,
                  border: `1px solid ${COLORS.border}`,
                  backgroundColor: "rgba(130, 77, 92, 0.06)",
                  color: COLORS.textPrimary,
                  fontSize: 13,
                }}
              >
                {t("suggest.hero.reassurance")}
              </Box>
            </Box>

            {/* Card */}
            <Box
              sx={{
                backgroundColor: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 4,
                p: { xs: 2.5, sm: 3.5 },
              }}
            >
              <SuggestStoryForm
                idToken={idToken}
                onSuccess={(_ideaId) => setView("success")}
                onRequireLogin={() =>
                  navigate(`/login?returnTo=/${lang ?? "he"}/suggest`, {
                    state: { from: location },
                    replace: true,
                  })
                }
              />
            </Box>
          </Box>
        ) : (
          <Box
            key="success"
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            sx={{ maxWidth: 560, mx: "auto" }}
          >
            <SuggestStorySuccess
              onSubmitAnother={() => {
                setView("form");
              }}
              onBrowse={() => navigate("/books")}
            />
          </Box>
        )}
      </AnimatePresenceCompat>
    </Box>
  );
}

