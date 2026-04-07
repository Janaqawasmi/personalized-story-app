import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import GlobalStyles from "@mui/material/GlobalStyles";
import { useLanguage } from "../../i18n/context/useLanguage";
import { createAppTheme } from "../../theme";
import { ReactNode } from "react";

interface ThemeWrapperProps {
  children: ReactNode;
}

export default function ThemeWrapper({ children }: ThemeWrapperProps) {
  const { direction } = useLanguage();
  const theme = createAppTheme(direction);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles
        styles={`
          @keyframes starPulse {
            0%, 100% { opacity: var(--min-op, 0.1); transform: scale(1); }
            50%       { opacity: var(--max-op, 0.7); transform: scale(1.3); }
          }
          @keyframes auroraDrift {
            0%   { transform: translate(0, 0) scale(1); }
            100% { transform: translate(20px, 15px) scale(1.1); }
          }
          @keyframes stepEnter {
            from { opacity: 0; transform: translateX(22px); }
            to   { opacity: 1; transform: translateX(0); }
          }
          @keyframes checkPop {
            from { transform: scale(0); }
            to   { transform: scale(1); }
          }
          @keyframes celebIn {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes tagIn {
            from { opacity: 0; transform: scale(0.7); }
            to   { opacity: 1; transform: scale(1); }
          }
        `}
      />
      {children}
    </ThemeProvider>
  );
}

