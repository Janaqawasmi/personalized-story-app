import {
  AppBar,
  Box,
  IconButton,
  Typography,
} from "@mui/material";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { MegaMenu } from "../MegaMenu/MegaMenu";
import { MegaSelection } from "../MegaMenu/types";

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

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          backgroundColor: "#fff",
          color: "#000",
          px: 4,
        }}
      >
        <Box
          sx={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            direction: "ltr", // 👈 THIS IS THE KEY
          }}
        >
          {/* LEFT — LOGO */}
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: "1.2rem",
              cursor: "pointer",
            }}
            onClick={() => navigate("/")}
          >
            QOSATI
          </Typography>

          {/* RIGHT — MENU + ICONS */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            {/* Mega menu trigger */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                fontWeight: 600,
              }}
              onClick={() => setMegaOpen((p) => !p)}
            >
              עיון בסיפורים
              <KeyboardArrowDownIcon />
            </Box>

            <IconButton onClick={() => navigate("/search")}>
              <SearchOutlinedIcon />
            </IconButton>

            <IconButton onClick={() => navigate("/login")}>
              <PersonOutlineOutlinedIcon />
            </IconButton>

            <IconButton onClick={() => navigate("/cart")}>
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
    </>
  );
}
