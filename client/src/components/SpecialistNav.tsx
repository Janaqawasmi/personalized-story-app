import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";

const SpecialistNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: "create-brief", label: "Create Story Brief" },
    { path: "generate-draft", label: "Generate Draft" },
    { path: "drafts", label: "Review Drafts" },
  ];

  // Check if current path matches nav item (handles both relative and absolute paths)
  const isActive = (itemPath: string) => {
    const currentPath = location.pathname;
    // Match relative path (e.g., "drafts" matches "/he/specialist/drafts")
    return currentPath.endsWith(`/specialist/${itemPath}`) || 
           currentPath.endsWith(`/${itemPath}`) ||
           (itemPath === "drafts" && (currentPath.endsWith("/specialist") || currentPath.endsWith("/specialist/")));
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

