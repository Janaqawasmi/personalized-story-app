import { Box, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

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
};

export function MegaMenu({ isOpen, onClose, onApply, value }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // 🔹 Firestore reference data
  const { data, loading } = useReferenceData();

  const [age, setAge] = useState<AgeId | null>(value?.age ?? null);
  const [category, setCategory] = useState<CategoryId | null>(
    value?.category ?? null
  );

  if (!isOpen || loading || !data) return null;

  // Handle age selection - navigate to age results
  const handleAgeSelect = (selectedAge: AgeId) => {
    setAge(selectedAge);
    if (selectedAge) {
      // If category is also selected, navigate to category page with age param
      if (category) {
        navigate(`/stories/category/${category}?age=${selectedAge}`);
      } else {
        navigate(`/stories/age/${selectedAge}`);
      }
      onClose();
    }
  };

  // Handle category selection - navigate to category results
  const handleCategorySelect = (categoryId: string) => {
    setCategory(categoryId);
    // If age is also selected, navigate with age param
    if (age) {
      navigate(`/stories/category/${categoryId}?age=${age}`);
    } else {
      navigate(`/stories/category/${categoryId}`);
    }
    onClose();
  };

  return (
    <Box sx={s.overlay}>
      <Box ref={panelRef} sx={s.panel}>
        <Box sx={s.header}>
          <Box sx={s.title}>עיון בסיפורים</Box>
          <Box sx={s.subtitle}>בחרו גיל או קטגוריה — גיל הוא אופציונלי</Box>

          <IconButton
            onClick={onClose}
            sx={{ position: "absolute", top: 10, left: 10 }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        <Box
          sx={{
            ...s.grid,
            gridTemplateColumns: "1fr 1fr", // 2 columns instead of 3
          }}
        >
          {/* גיל */}
          <AgeColumn selectedAge={age} onSelectAge={handleAgeSelect} />

          {/* קטגוריות */}
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
