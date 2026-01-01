import { Box } from "@mui/material";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import React from "react";

import { AgeColumn } from "./AgeColumn";
import { CategoryColumn } from "./CategoryColumn";

import * as s from "./styles";
import { useReferenceData } from "../../hooks/useReferenceData";
import { AgeId, CategoryId, MegaSelection } from "./types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onApply: (selection: MegaSelection) => void;
  value?: MegaSelection;
  triggerRef?: React.RefObject<HTMLDivElement | null>;
};

export function MegaMenu({
  isOpen,
  onClose,
  onApply,
  value,
  triggerRef,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // 🔹 Firestore reference data
  const { data, loading } = useReferenceData();

  // No internal state - MegaMenu is just an entry point, not a filter manager

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        panelRef.current?.contains(target) ||
        triggerRef?.current?.contains(target)
      ) {
        return;
      }

      onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen || loading || !data) return null;

  // Handle navigation when item is selected
  const handleCategorySelect = (categoryId: string) => {
    // Navigate immediately with only current selection - no old state
    navigate(`/stories/category/${categoryId}`, {
      state: {
        fromMegaMenu: true,
        age: null, // Only current selection - no fallback to old state
        category: categoryId,
      },
    });
    onClose();
  };

  const handleAgeSelect = (selectedAge: AgeId) => {
    if (selectedAge) {
      // Navigate immediately with only current selection - no old state
      // Always navigate to age route (no category) since we reset state on open
      navigate(`/stories/age/${selectedAge}`, {
        state: {
          fromMegaMenu: true,
          age: selectedAge,
          category: null, // Only current selection - no fallback to old state
        },
      });
      onClose();
    }
  };

  return (
    <Box ref={panelRef} sx={s.panel}>
      <Box sx={s.container}>
        <Box sx={s.grid}>
          {/* Right column: Age */}
          <AgeColumn selectedAge={null} onSelectAge={handleAgeSelect} />

          {/* Left column: Category */}
          <CategoryColumn
            topics={data.topics}
            selectedTopicKey={null}
            onSelect={handleCategorySelect}
            lang="he"
          />
        </Box>
      </Box>
    </Box>
  );
}
