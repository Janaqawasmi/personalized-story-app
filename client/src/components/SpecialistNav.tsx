import React from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";

const SpecialistNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const navItems = [
    { path: "create-brief", label: "Create Story Brief" },
    { path: "generate-draft", label: "Generate Draft" },
    { path: "drafts", label: "Review Drafts" },
  ];

  // Check if current path matches nav item (handles both relative and absolute paths)
  const isActive = (itemPath: string) => {
    const currentPath = location.pathname;
    const [basePath, queryString] = itemPath.split("?");

    const pathMatches =
      currentPath.endsWith(`/specialist/${basePath}`) ||
      currentPath.endsWith(`/${basePath}`) ||
      (basePath === "drafts" && (currentPath.endsWith("/specialist") || currentPath.endsWith("/specialist/")));

    if (!pathMatches) return false;

    // If the nav item has query params, only match when those params are present
    if (queryString) {
      const navParams = new URLSearchParams(queryString);
      const entries = Array.from(navParams.entries());
      for (let i = 0; i < entries.length; i++) {
        if (searchParams.get(entries[i][0]) !== entries[i][1]) return false;
      }
      return true;
    }

    // For the "Generate Draft" link (no query params), don't highlight if tab=in_review is active
    if (basePath === "generate-draft" && searchParams.get("tab") === "in_review") {
      return false;
    }

    return true;
  };

  // Navigate to sibling routes using "../" to go up one level from current route
  const handleNavClick = (itemPath: string) => {
    // Check if we're already at the specialist index route
    const isAtIndex = location.pathname.endsWith("/specialist") || location.pathname.endsWith("/specialist/");
    
    if (isAtIndex) {
      // At index, use direct relative path
      navigate(itemPath);
    } else {
      // On a sub-page, use "../" to navigate to sibling route
      navigate(`../${itemPath}`);
    }
  };

  return (
    <AppBar position="static" sx={{ mb: 3 }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 0, mr: 4 }}>
          Specialist Portal
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          {navItems.map((item) => (
            <Button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              color="inherit"
              variant={isActive(item.path) ? "outlined" : "text"}
              sx={{
                borderColor: isActive(item.path) ? "white" : "transparent",
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default SpecialistNav;

