import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Typography,
  Menu,
  MenuItem,
} from "@mui/material";
import dammahLogo from "../../assets/brand/dammah-logo.png";
import { useTheme } from "@mui/material/styles";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useRef, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useLangNavigate } from "../../i18n/navigation";
import { useTranslation } from "../../i18n/useTranslation";
import { useLanguage } from "../../i18n/context/useLanguage";
import { useAuth } from "../../contexts/AuthContext";

import { MegaMenu } from "../MegaMenu/MegaMenu";
import { MegaSelection } from "../MegaMenu/types";
import SearchOverlay from "./SearchOverlay";

type NavbarProps = {
  currentSelection: MegaSelection;
  onApplyFilters: (sel: MegaSelection) => void;
};

export default function Navbar({
  currentSelection,
  onApplyFilters,
}: NavbarProps) {
  const navigate = useLangNavigate();
  const navigateDirect = useNavigate();
  const { pathname } = useLocation();
  const { lang } = useParams<{ lang: string }>();
  const { language, setLanguage } = useLanguage();
  const t = useTranslation();
  const { currentUser, logout, loading: authLoading } = useAuth();
  const [megaOpen, setMegaOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [langMenuAnchor, setLangMenuAnchor] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const megaButtonRef = useRef<HTMLDivElement>(null);

  const handleLangMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setLangMenuAnchor(event.currentTarget);
  };

  const handleLangMenuClose = () => {
    setLangMenuAnchor(null);
  };

  const handleLanguageChange = (newLang: "he" | "en" | "ar") => {
    if (newLang === language) {
      handleLangMenuClose();
      return;
    }

    // Replace language segment in URL
    const currentLang = lang || language;
    const newPath = pathname.replace(`/${currentLang}`, `/${newLang}`);
    
    // Update language in context (this will update localStorage and direction)
    setLanguage(newLang);
    
    // Navigate to new path
    navigateDirect(newPath);
    
    handleLangMenuClose();
  };

  const handleLogout = async () => {
    try {
      await logout();
      setSearchOpen(false);
    } catch (err) {
      console.error("[Navbar] logout failed:", err);
    }
  };

  return (
    <>
     <AppBar
  position="fixed"
  elevation={0}
  sx={{
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    px: 4,
    height: { xs: 56, md: 60 }, // ✅ SOURCE OF TRUTH
    zIndex: 1300,
    pointerEvents: "auto",
  }}
>

<Box
  sx={{
    height: "100%", // ✅ inherit from AppBar
    display: "flex",
    alignItems: "center",
    pointerEvents: "auto",
  }}
>

          {/* 1️⃣ RIGHT SECTION — Text Navigation Links */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              flex: 1,
              justifyContent: "flex-start", // RTL: flex-start = right side
            }}
          >
            {/* Mega menu trigger */}
            <Box
              ref={megaButtonRef}
              sx={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.95rem",
                gap: 0.5,
              }}
              onClick={() => {
                setMegaOpen(prev => !prev); // 🔁 toggle בלבד - אין ניווט
                setSearchOpen(false); // Close search overlay if open
              }}
            >
              {t("navbar.browseStories")}
              <KeyboardArrowDownIcon fontSize="small" />
            </Box>
          </Box>

          {/* 2️⃣ CENTER SECTION — Logo */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              height: "100%",
            }}
          >
            <Box
              component="img"
              src={dammahLogo}
              alt="DAMMAH"
              sx={{
                height: "155%", // 🔥 brand-dominant
                maxHeight: "200%",
                width: "auto",
                objectFit: "contain",
                cursor: "pointer",
                display: "block",
                transition: "opacity 0.2s ease",
              }}
              
              onClick={() => {
                // Navigate home without clearing personalization
                // Draft sessions are preserved for resuming
                // Completed sessions are preserved for user choice
                navigate("/");
                setSearchOpen(false); // Close search overlay if open
              }}
            />
          </Box>

          {/* 3️⃣ LEFT SECTION — Utility Icons */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flex: 1,
              justifyContent: "flex-end", // RTL: flex-end = left side
            }}
          >
            <IconButton onClick={() => setSearchOpen(true)}>
              <SearchOutlinedIcon />
            </IconButton>

            {authLoading ? (
              <CircularProgress size={22} />
            ) : currentUser ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" sx={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                  Hello, {currentUser.displayName || currentUser.email}
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  onClick={handleLogout}
                  sx={{ textTransform: "none", whiteSpace: "nowrap" }}
                >
                  Logout
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => {
                    navigate("/login", { state: { mode: "login" } });
                    setSearchOpen(false); // Close search overlay if open
                  }}
                  sx={{ textTransform: "none", whiteSpace: "nowrap" }}
                >
                  {t("login.title")}
                </Button>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => {
                    navigate("/login", { state: { mode: "signup" } });
                    setSearchOpen(false); // Close search overlay if open
                  }}
                  sx={{ textTransform: "none", whiteSpace: "nowrap" }}
                >
                  {t("login.goToSignup")}
                </Button>
              </Box>
            )}

            <IconButton
              onClick={() => {
                navigate("/cart");
                setSearchOpen(false); // Close search overlay if open
              }}
            >
              <ShoppingBagOutlinedIcon />
            </IconButton>

            <IconButton
              onClick={() => {
                navigate("/specialist");
                setSearchOpen(false); // Close search overlay if open
              }}
            >
              <VerifiedUserIcon />
            </IconButton>

            <IconButton onClick={handleLangMenuOpen}>
              <LanguageOutlinedIcon />
            </IconButton>
            <Menu
              anchorEl={langMenuAnchor}
              open={Boolean(langMenuAnchor)}
              onClose={handleLangMenuClose}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
            >
              <MenuItem
                onClick={() => handleLanguageChange("he")}
                selected={language === "he"}
              >
                {t("navbar.hebrew")}
              </MenuItem>
              <MenuItem
                onClick={() => handleLanguageChange("en")}
                selected={language === "en"}
              >
                {t("navbar.english")}
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </AppBar>

      {/* Mega Menu */}
      <MegaMenu
        isOpen={megaOpen}
        onClose={() => setMegaOpen(false)}
        onApply={(sel) => {
          onApplyFilters(sel);
          setMegaOpen(false);
        }}
        value={currentSelection}
        triggerRef={megaButtonRef}
      />

      {/* Search Overlay */}
      <SearchOverlay
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </>
  );
}
