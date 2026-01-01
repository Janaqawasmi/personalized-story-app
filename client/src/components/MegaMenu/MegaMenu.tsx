import { Box } from "@mui/material";
import { useEffect, useRef, useState } from "react";
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

  const [age, setAge] = useState<AgeId | null>(value?.age ?? null);
  const [category, setCategory] = useState<CategoryId | null>(
    value?.category ?? null
  );

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
    setCategory(categoryId);
    navigate(`/stories/category/${categoryId}`);
    onClose();
  };

  const handleAgeSelect = (selectedAge: AgeId) => {
    setAge(selectedAge);
    if (selectedAge) {
      if (category) {
        navigate(`/stories/category/${category}?age=${selectedAge}`);
      } else {
        navigate(`/stories/age/${selectedAge}`);
      }
      onClose();
    }
  };

  return (
    <Box ref={panelRef} sx={s.panel}>
      <Box sx={s.container}>
        <Box sx={s.grid}>
          {/* Right column: Age */}
          <AgeColumn selectedAge={age} onSelectAge={handleAgeSelect} />

          {/* Left column: Category */}
          <CategoryColumn
            topics={data.topics}
            selectedTopicKey={category}
            onSelect={handleCategorySelect}
            lang="he"
          />
        </Box>
      </Box>
    </Box>
  );
}
