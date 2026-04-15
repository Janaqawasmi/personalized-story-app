import { Box, Container, Typography, IconButton, Stack } from "@mui/material";
import { motion } from "framer-motion";
import { Instagram, Facebook, Youtube, Shield, Heart, Lock, Send } from "lucide-react";
import { useState } from "react";
import dammahLogo from "../assets/brand/dammah-logo.png";
import { COLORS } from "../theme";
import { useTranslation } from "../i18n/useTranslation";
import { useLanguage } from "../i18n/context/useLanguage";
import { useLangNavigate } from "../i18n/navigation";

const FOOTER_BG = "#DDD4CC";
const FOOTER_BORDER = "#C4B8AC";
const FOOTER_LINK = "#5F5048";
const FOOTER_MUTED = "#6B5D52";
const ROSE_HOVER = "#6D404D";

type FooterLink = { labelKey: string; path: string };

const LINKS: Record<string, FooterLink[]> = {
  explore: [
    { labelKey: "footer.links.allStories", path: "/books" },
    { labelKey: "footer.links.byEmotion", path: "/books#categories" },
    { labelKey: "footer.links.byAge", path: "/books#ages" },
    { labelKey: "footer.links.howItWorks", path: "/" },
    { labelKey: "footer.links.pricing", path: "/" },
  ],
  support: [
    { labelKey: "footer.links.faq", path: "/" },
    { labelKey: "footer.links.contact", path: "/" },
    { labelKey: "footer.links.parentGuide", path: "/" },
    { labelKey: "footer.links.approach", path: "/" },
    { labelKey: "footer.links.myOrders", path: "/my-stories" },
  ],
  company: [
    { labelKey: "footer.links.about", path: "/" },
    { labelKey: "footer.links.blog", path: "/" },
    { labelKey: "footer.links.careers", path: "/" },
    { labelKey: "footer.links.press", path: "/" },
  ],
  legal: [
    { labelKey: "footer.links.privacy", path: "/" },
    { labelKey: "footer.links.terms", path: "/" },
    { labelKey: "footer.links.childSafety", path: "/" },
    { labelKey: "footer.links.refund", path: "/" },
    { labelKey: "footer.links.cookies", path: "/" },
  ],
};

export default function Footer() {
  const t = useTranslation();
  const { isRTL } = useLanguage();
  const navigate = useLangNavigate();
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: wire to newsletter endpoint
    setEmail("");
  };

  const renderColumn = (titleKey: string, links: FooterLink[]) => (
    <Box>
      <Typography
        sx={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 15,
          fontWeight: 500,
          color: COLORS.textPrimary,
          mb: 2,
          letterSpacing: "0.3px",
        }}
      >
        {t(titleKey)}
      </Typography>
      <Stack spacing={1.25}>
        {links.map((link) => (
          <Box
            key={link.labelKey}
            component={motion.a}
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              navigate(link.path);
            }}
            whileHover={{ x: isRTL ? -2 : 2 }}
            sx={{
              fontSize: 13,
              color: FOOTER_LINK,
              textDecoration: "none",
              cursor: "pointer",
              display: "inline-block",
              transition: "color 0.2s",
              "&:hover": { color: COLORS.secondary },
            }}
          >
            {t(link.labelKey)}
          </Box>
        ))}
      </Stack>
    </Box>
  );

  const trustItems = [
    { Icon: Shield, key: "footer.trust.safe" },
    { Icon: Heart, key: "footer.trust.therapy" },
    { Icon: Lock, key: "footer.trust.secure" },
  ];

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: FOOTER_BG,
        color: COLORS.textPrimary,
        pt: { xs: 6, md: 8 },
        pb: 3,
      }}
    >
      <Container maxWidth="lg">
        {/* Main grid: brand + 4 link columns */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "1fr 1fr",
              md: "1.6fr 1fr 1fr 1fr 1fr",
            },
            gap: { xs: 4, md: 5 },
            mb: 5,
          }}
        >
          {/* Brand column */}
          <Box sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}>
            <Box
              onClick={() => navigate("/")}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                mb: 1.5,
                cursor: "pointer",
                width: "fit-content",
              }}
            >
              <Box
                component="img"
                src={dammahLogo}
                alt="DAMMAH"
                sx={{
                  height: 40,
                  width: "auto",
                  objectFit: "contain",
                  display: "block",
                }}
              />
              <Typography
                sx={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 26,
                  fontWeight: 500,
                  color: COLORS.secondary,
                  letterSpacing: "0.5px",
                  lineHeight: 1,
                }}
              >
                DAMMAH
              </Typography>
            </Box>
            <Typography
              sx={{
                fontSize: 14,
                lineHeight: 1.7,
                color: FOOTER_LINK,
                mb: 2.5,
                maxWidth: 320,
              }}
            >
              {t("footer.tagline")}
            </Typography>

            {/* Newsletter */}
            <Typography
              component="label"
              sx={{
                fontSize: 12,
                fontWeight: 500,
                color: COLORS.textPrimary,
                display: "block",
                mb: 1,
              }}
            >
              {t("footer.newsletter.label")}
            </Typography>
            <Box
              component="form"
              onSubmit={handleSubscribe}
              sx={{
                display: "flex",
                maxWidth: 300,
                border: `1px solid ${FOOTER_BORDER}`,
                borderRadius: "8px",
                overflow: "hidden",
                bgcolor: COLORS.surface,
                transition: "border-color 0.2s",
                "&:focus-within": { borderColor: COLORS.secondary },
              }}
            >
              <Box
                component="input"
                type="email"
                required
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEmail(e.target.value)
                }
                placeholder={t("footer.newsletter.placeholder")}
                sx={{
                  flex: 1,
                  border: "none",
                  px: 1.5,
                  py: 1.25,
                  fontSize: 13,
                  bgcolor: "transparent",
                  outline: "none",
                  fontFamily: "inherit",
                  minWidth: 0,
                  color: COLORS.textPrimary,
                  "&::placeholder": { color: "#A4A4A4" },
                }}
              />
              <Box
                component="button"
                type="submit"
                sx={{
                  bgcolor: COLORS.secondary,
                  color: COLORS.surface,
                  border: "none",
                  px: 2,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  transition: "background 0.2s",
                  "&:hover": { bgcolor: ROSE_HOVER },
                }}
              >
                <Send size={14} />
                {t("footer.newsletter.cta")}
              </Box>
            </Box>

            {/* Socials */}
            <Stack direction="row" spacing={1.25} sx={{ mt: 2.5 }}>
              {[
                { Icon: Instagram, label: "Instagram" },
                { Icon: Facebook, label: "Facebook" },
                { Icon: Youtube, label: "YouTube" },
              ].map(({ Icon, label }) => (
                <IconButton
                  key={label}
                  aria-label={label}
                  sx={{
                    width: 36,
                    height: 36,
                    border: `1px solid ${FOOTER_BORDER}`,
                    color: FOOTER_LINK,
                    transition: "all 0.2s",
                    "&:hover": {
                      bgcolor: COLORS.secondary,
                      color: COLORS.surface,
                      borderColor: COLORS.secondary,
                    },
                  }}
                >
                  <Icon size={15} />
                </IconButton>
              ))}
            </Stack>
          </Box>

          {/* Link columns */}
          {renderColumn("footer.headings.explore", LINKS.explore)}
          {renderColumn("footer.headings.support", LINKS.support)}
          {renderColumn("footer.headings.company", LINKS.company)}
          {renderColumn("footer.headings.legal", LINKS.legal)}
        </Box>

        {/* Trust strip */}
        <Stack
          direction="row"
          sx={{
            py: 2.5,
            borderTop: `1px solid ${FOOTER_BORDER}`,
            borderBottom: `1px solid ${FOOTER_BORDER}`,
            mb: 2.5,
            flexWrap: "wrap",
            justifyContent: "center",
            gap: { xs: 2, sm: 3.5 },
          }}
        >
          {trustItems.map(({ Icon, key }) => (
            <Stack
              key={key}
              direction="row"
              spacing={1.25}
              alignItems="center"
            >
              <Icon size={18} color={COLORS.secondary} strokeWidth={2} />
              <Typography sx={{ fontSize: 12, color: FOOTER_LINK }}>
                {t(key)}
              </Typography>
            </Stack>
          ))}
        </Stack>

        {/* Bottom bar — copyright only (language switcher lives in Navbar) */}
        <Box sx={{ textAlign: "center" }}>
          <Typography sx={{ fontSize: 12, color: FOOTER_MUTED, m: 0 }}>
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
