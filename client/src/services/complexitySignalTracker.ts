/**
 * Session-only complexity UI signals (spec §21 — layer sequencing / de-duplication).
 * In-memory only — not persisted to localStorage. Resets on reload; callers reset on submit / draft clear.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ComplexityLoadState } from "./complexityBudget";

// ---------------------------------------------------------------------------
// Context value (hook API)
// ---------------------------------------------------------------------------

export interface ComplexitySignalsApi {
  hasAcknowledgedLengthBump: boolean;
  markLengthBumpAcknowledged: () => void;
  /**
   * Pre-submit overload warning (Layer 4): show only when load is red and the psychologist
   * has not yet acknowledged overload via the length-bump action.
   */
  shouldShowPreSubmitWarning: (currentState: ComplexityLoadState) => boolean;
  /**
   * Clears all session flags — call after successful submit, when abandoning/clearing the draft,
   * or when starting a fresh editing session for the same route without remounting the provider.
   */
  resetComplexitySession: () => void;
}

const ComplexitySignalContext = createContext<ComplexitySignalsApi | null>(null);

interface InternalState {
  lengthBumpAcknowledged: boolean;
}

const INITIAL: InternalState = {
  lengthBumpAcknowledged: false,
};

export interface ComplexitySignalProviderProps {
  children: React.ReactNode;
}

/**
 * Wraps the story brief form tree so section checkpoint, meter, and submit gate share signal state.
 */
export function ComplexitySignalProvider({ children }: ComplexitySignalProviderProps) {
  const [state, setState] = useState<InternalState>(INITIAL);

  const markLengthBumpAcknowledged = useCallback(() => {
    setState((s) => ({ ...s, lengthBumpAcknowledged: true }));
  }, []);

  const resetComplexitySession = useCallback(() => {
    setState(INITIAL);
  }, []);

  const shouldShowPreSubmitWarning = useCallback(
    (currentState: ComplexityLoadState) => {
      if (currentState !== "red") return false;
      if (state.lengthBumpAcknowledged) return false;
      return true;
    },
    [state.lengthBumpAcknowledged],
  );

  const value = useMemo<ComplexitySignalsApi>(
    () => ({
      hasAcknowledgedLengthBump: state.lengthBumpAcknowledged,
      markLengthBumpAcknowledged,
      shouldShowPreSubmitWarning,
      resetComplexitySession,
    }),
    [
      state.lengthBumpAcknowledged,
      markLengthBumpAcknowledged,
      shouldShowPreSubmitWarning,
      resetComplexitySession,
    ],
  );

  return React.createElement(ComplexitySignalContext.Provider, { value }, children);
}

export function useComplexitySignals(): ComplexitySignalsApi {
  const ctx = useContext(ComplexitySignalContext);
  if (ctx == null) {
    throw new Error("useComplexitySignals must be used within ComplexitySignalProvider");
  }
  return ctx;
}
