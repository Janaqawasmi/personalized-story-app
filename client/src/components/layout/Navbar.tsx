import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Badge,
  Tooltip,
} from "@mui/material";
import dammahLogo from "../../assets/brand/dammah-logo.png";
import { useTheme } from "@mui/material/styles";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useRef, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useLangNavigate } from "../../i18n/navigation";
import { useTranslation } from "../../i18n/useTranslation";
import { useLanguage } from "../../i18n/context/useLanguage";
import { useAuth } from "../../contexts/AuthContext";
import { Z_INDEX_NAVBAR } from "../../constants/zIndex";

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
  const { language, setLanguage, isRTL } = useLanguage();
  const t = useTranslation();
  const { currentUser, logout, loading: authLoading } = useAuth();
  const [megaOpen, setMegaOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [langMenuAnchor, setLangMenuAnchor] = useState<null | HTMLElement>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const megaButtonRef = useRef<HTMLDivElement>(null);

  const handleLangMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setLangMenuAnchor(event.currentTarget);
  };

  const handleLangMenuClose = () => {
    setLangMenuAnchor(null);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
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
      handleUserMenuClose();
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
    zIndex: Z_INDEX_NAVBAR,
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

          {/* 3️⃣ LEFT SECTION — User Actions */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flex: 1,
              justifyContent: "flex-end", // RTL: flex-end = left side
            }}
          >
            {authLoading ? (
              <CircularProgress size={22} />
            ) : currentUser ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                {/* 1) Favorites */}
                <IconButton
                  onClick={() => {
                    navigate("/favorites");
                    setSearchOpen(false);
                  }}
                  aria-label={t("navbar.labels.favorites")}
                >
                  <Tooltip title={t("navbar.labels.favorites")}>
                    <Badge color="error" badgeContent={0} invisible>
                      <FavoriteBorderIcon />
                    </Badge>
                  </Tooltip>
                </IconButton>

                {/* 2) Cart */}
                <IconButton
                  onClick={() => {
                    navigate("/cart");
                    setSearchOpen(false);
                  }}
                  aria-label={t("navbar.labels.cart")}
                >
                  <Tooltip title={t("navbar.labels.cart")}>
                    <Badge color="primary" badgeContent={0} invisible>
                      <ShoppingBagOutlinedIcon />
                    </Badge>
                  </Tooltip>
                </IconButton>

                {/* 3) User menu trigger */}
                <Button
                  size="small"
                  variant="text"
                  onClick={handleUserMenuOpen}
                  sx={{
                    textTransform: "none",
                    borderRadius: 2,
                    px: 1,
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    color: theme.palette.text.primary,
                  }}
                >
                  <AccountCircleOutlinedIcon fontSize="small" />
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: "nowrap",
                      fontWeight: 600,
                      maxWidth: { xs: 90, sm: 140 },
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: { xs: "none", sm: "inline" },
                    }}
                  >
                    {currentUser.displayName || currentUser.email}
                  </Typography>
                  <KeyboardArrowDownIcon fontSize="small" />
                </Button>

                {/* 4) Search */}
                <IconButton onClick={() => setSearchOpen(true)} aria-label={t("navbar.labels.search")}>
                  <Tooltip title={t("navbar.labels.search")}>
                    <SearchOutlinedIcon />
                  </Tooltip>
                </IconButton>

                {/* Language switcher stays available but outside required action sequence */}
                <IconButton onClick={handleLangMenuOpen} aria-label="language">
                  <LanguageOutlinedIcon />
                </IconButton>

                <Menu
                  anchorEl={userMenuAnchor}
                  open={Boolean(userMenuAnchor)}
                  onClose={handleUserMenuClose}
                  anchorOrigin={{
                    vertical: "bottom",
                    horizontal: isRTL ? "left" : "right",
                  }}
                  transformOrigin={{
                    vertical: "top",
                    horizontal: isRTL ? "left" : "right",
                  }}
                >
                  <MenuItem
                    onClick={() => {
                      navigate("/my-stories");
                      handleUserMenuClose();
                    }}
                  >
                    {t("navbar.userMenu.myStories")}
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      navigate("/favorites");
                      handleUserMenuClose();
                    }}
                  >
                    {t("navbar.userMenu.favorites")}
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>{t("navbar.userMenu.logout")}</MenuItem>
                </Menu>
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
                <IconButton onClick={handleLangMenuOpen} aria-label="language">
                  <LanguageOutlinedIcon />
                </IconButton>
                <IconButton onClick={() => setSearchOpen(true)} aria-label="search">
                  <SearchOutlinedIcon />
                </IconButton>
              </Box>
            )}
            <Menu
              anchorEl={langMenuAnchor}
              open={Boolean(langMenuAnchor)}
              onClose={handleLangMenuClose}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: isRTL ? "left" : "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: isRTL ? "left" : "right",
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
