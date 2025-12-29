import {
  AppBar,
  Box,
  IconButton,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  const [megaOpen, setMegaOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const theme = useTheme();

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          px: 4,
          zIndex: 1300, // מעל ה-SearchOverlay (zIndex: 1200-1201)
          pointerEvents: "auto", // Ensure navbar is always clickable
        }}
      >
        <Box
          sx={{
            height: 64,
            display: "flex",
            alignItems: "center",
            direction: "rtl", // RTL direction for Hebrew/Arabic
            pointerEvents: "auto", // Ensure all navbar items are clickable
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
              sx={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.95rem",
                gap: 0.5,
              }}
              onClick={() => {
                setMegaOpen((p) => !p);
                setSearchOpen(false); // Close search overlay if open
              }}
            >
              עיון בסיפורים
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
            }}
          >
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: "1.2rem",
                cursor: "pointer",
                transition: "opacity 0.2s ease",
                "&:hover": {
                  opacity: 0.8,
                },
              }}
              onClick={() => {
                // Clear all personalization data when navigating home
                // This ensures personalization is session-scoped, not persistent
                Object.keys(localStorage)
                  .filter((k) => k.startsWith("qosati_personalization_"))
                  .forEach((k) => localStorage.removeItem(k));
                
                navigate("/");
                setSearchOpen(false); // Close search overlay if open
              }}
            >
              QOSATI
            </Typography>
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

            <IconButton
              onClick={() => {
                navigate("/login");
                setSearchOpen(false); // Close search overlay if open
              }}
            >
              <PersonOutlineOutlinedIcon />
            </IconButton>

            <IconButton
              onClick={() => {
                navigate("/cart");
                setSearchOpen(false); // Close search overlay if open
              }}
            >
              <ShoppingBagOutlinedIcon />
            </IconButton>

            <IconButton>
              <LanguageOutlinedIcon />
            </IconButton>
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
      />

      {/* Search Overlay */}
      <SearchOverlay
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </>
  );
}
