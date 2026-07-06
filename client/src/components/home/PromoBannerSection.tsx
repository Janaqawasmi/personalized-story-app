import { useEffect, useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../i18n/context/useLanguage";
import { fetchBanners, type PublicBanner } from "../../api/publicBanners";

export default function PromoBannerSection() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [banners, setBanners] = useState<PublicBanner[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchBanners()
      .then((rows) => {
        if (!cancelled) setBanners(rows);
      })
      .catch((err) => console.error("[PromoBannerSection] failed to load banners:", err));
    return () => {
      cancelled = true;
    };
  }, []);

  if (banners.length === 0) return null;

  const localize = (value: PublicBanner["title"]) =>
    value[language as "en" | "he" | "ar"] || value.en || value.he || value.ar || "";

  const handleClick = (link: string) => {
    if (!link) return;
    if (/^https?:\/\//.test(link)) {
      window.open(link, "_blank", "noopener,noreferrer");
    } else {
      navigate(link);
    }
  };

  return (
    <Box component="section" sx={{ px: { xs: 2, md: 8 }, py: { xs: 3, md: 4 }, display: "flex", flexDirection: "column", gap: 2 }}>
      {banners.map((banner) => {
        const title = localize(banner.title);
        const description = localize(banner.description);
        const buttonText = localize(banner.buttonText);
        return (
          <Box
            key={banner.id}
            sx={{
              position: "relative",
              borderRadius: "20px",
              overflow: "hidden",
              minHeight: { xs: 160, md: 220 },
              display: "flex",
              alignItems: "center",
              backgroundImage: banner.imageUrl ? `url(${banner.imageUrl})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              bgcolor: "#824D5C",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0.05))",
              }}
            />
            <Box sx={{ position: "relative", p: { xs: 3, md: 5 }, maxWidth: 560 }}>
              {title && (
                <Typography sx={{ fontSize: { xs: 20, md: 28 }, fontWeight: 700, color: "#fff", mb: 1 }}>
                  {title}
                </Typography>
              )}
              {description && (
                <Typography sx={{ fontSize: { xs: 13, md: 15 }, color: "rgba(255,255,255,0.9)", mb: 2 }}>
                  {description}
                </Typography>
              )}
              {buttonText && banner.buttonLink && (
                <Button
                  onClick={() => handleClick(banner.buttonLink)}
                  variant="contained"
                  sx={{
                    textTransform: "none",
                    bgcolor: "#fff",
                    color: "#333",
                    borderRadius: "10px",
                    px: 3,
                    "&:hover": { bgcolor: "#f0f0f0" },
                  }}
                >
                  {buttonText}
                </Button>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
