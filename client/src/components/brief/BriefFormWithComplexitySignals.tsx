// Wraps BriefForm with session-only complexity signal state (spec §21 de-duplication).
// `key={draftId}` remounts the provider when switching drafts so flags reset without localStorage.

import React from "react";
import { useParams } from "react-router-dom";
import { ComplexitySignalProvider } from "../../services/complexitySignalTracker";
import BriefForm from "./BriefForm";

export default function BriefFormWithComplexitySignals() {
  const { draftId } = useParams();
  return (
    <ComplexitySignalProvider key={draftId ?? "draft"}>
      <BriefForm />
    </ComplexitySignalProvider>
  );
}
