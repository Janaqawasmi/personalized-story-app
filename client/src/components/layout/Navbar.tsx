import {
  AppBar,
  Box,
  IconButton,
  Typography,
} from "@mui/material";
import dammahLogo from "../../assets/brand/dammah-logo.png";
import { useTheme } from "@mui/material/styles";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useRef, useState } from "react";
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
  const megaButtonRef = useRef<HTMLDivElement>(null);

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
    direction: "rtl",
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
