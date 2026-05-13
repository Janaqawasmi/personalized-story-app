import { useMemo } from "react";
import { useLanguage } from "./context/useLanguage";
import {
  SPECIALIST_DESK_AR,
  SPECIALIST_DESK_EN,
  SPECIALIST_DESK_HE,
} from "./specialistDeskLocales";
import type { SpecialistDeskUi } from "./specialistDeskUi.types";

export type { SpecialistDeskUi } from "./specialistDeskUi.types";

export function useSpecialistDeskUi(): SpecialistDeskUi {
  const { language } = useLanguage();
  return useMemo(() => {
    if (language === "en") return SPECIALIST_DESK_EN;
    if (language === "ar") return SPECIALIST_DESK_AR;
    return SPECIALIST_DESK_HE;
  }, [language]);
}
