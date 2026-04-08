import React from "react";
import { renderHook, act } from "@testing-library/react";
import {
  ComplexitySignalProvider,
  useComplexitySignals,
} from "./complexitySignalTracker";
import type { ComplexityLoadState } from "./complexityBudget";

function wrapper({ children }: { children: React.ReactNode }) {
  return <ComplexitySignalProvider>{children}</ComplexitySignalProvider>;
}

describe("ComplexitySignalProvider / useComplexitySignals", () => {
  test("initial state — nothing shown or acknowledged", () => {
    const { result } = renderHook(() => useComplexitySignals(), { wrapper });

    expect(result.current.hasSeenMidFlowCheckpoint).toBe(false);
    expect(result.current.hasAcknowledgedLengthBump).toBe(false);
    expect(result.current.shouldShowPreSubmitWarning("green")).toBe(false);
    expect(result.current.shouldShowPreSubmitWarning("yellow")).toBe(false);
    expect(result.current.shouldShowPreSubmitWarning("red")).toBe(true);
  });

  test("after mid-flow checkpoint seen — pre-submit red warning suppressed", () => {
    const { result } = renderHook(() => useComplexitySignals(), { wrapper });

    act(() => {
      result.current.markMidFlowCheckpointSeen();
    });

    expect(result.current.hasSeenMidFlowCheckpoint).toBe(true);
    expect(result.current.hasAcknowledgedLengthBump).toBe(false);
    expect(result.current.shouldShowPreSubmitWarning("red")).toBe(false);
  });

  test("after length bump acknowledged — pre-submit red warning suppressed", () => {
    const { result } = renderHook(() => useComplexitySignals(), { wrapper });

    act(() => {
      result.current.markLengthBumpAcknowledged();
    });

    expect(result.current.hasSeenMidFlowCheckpoint).toBe(false);
    expect(result.current.hasAcknowledgedLengthBump).toBe(true);
    expect(result.current.shouldShowPreSubmitWarning("red")).toBe(false);
  });

  test("after both mid-flow and length bump — still suppressed on red", () => {
    const { result } = renderHook(() => useComplexitySignals(), { wrapper });

    act(() => {
      result.current.markMidFlowCheckpointSeen();
      result.current.markLengthBumpAcknowledged();
    });

    expect(result.current.hasSeenMidFlowCheckpoint).toBe(true);
    expect(result.current.hasAcknowledgedLengthBump).toBe(true);
    expect(result.current.shouldShowPreSubmitWarning("red")).toBe(false);
  });

  test("pre-submit decision matrix — non-red never shows overload warning", () => {
    const { result } = renderHook(() => useComplexitySignals(), { wrapper });

    const nonRed: ComplexityLoadState[] = ["green", "yellow"];
    nonRed.forEach((st) => {
      expect(result.current.shouldShowPreSubmitWarning(st)).toBe(false);
    });

    act(() => {
      result.current.markMidFlowCheckpointSeen();
    });
    nonRed.forEach((st) => {
      expect(result.current.shouldShowPreSubmitWarning(st)).toBe(false);
    });
  });

  test("pre-submit: red + neither acknowledgment → show", () => {
    const { result } = renderHook(() => useComplexitySignals(), { wrapper });
    expect(result.current.shouldShowPreSubmitWarning("red")).toBe(true);
  });

  test("pre-submit: red + only mid-flow → hide", () => {
    const { result } = renderHook(() => useComplexitySignals(), { wrapper });
    act(() => result.current.markMidFlowCheckpointSeen());
    expect(result.current.shouldShowPreSubmitWarning("red")).toBe(false);
  });

  test("pre-submit: red + only length bump → hide", () => {
    const { result } = renderHook(() => useComplexitySignals(), { wrapper });
    act(() => result.current.markLengthBumpAcknowledged());
    expect(result.current.shouldShowPreSubmitWarning("red")).toBe(false);
  });

  test("resetComplexitySession clears flags and restores pre-submit red show", () => {
    const { result } = renderHook(() => useComplexitySignals(), { wrapper });

    act(() => {
      result.current.markMidFlowCheckpointSeen();
      result.current.markLengthBumpAcknowledged();
    });
    expect(result.current.shouldShowPreSubmitWarning("red")).toBe(false);

    act(() => {
      result.current.resetComplexitySession();
    });

    expect(result.current.hasSeenMidFlowCheckpoint).toBe(false);
    expect(result.current.hasAcknowledgedLengthBump).toBe(false);
    expect(result.current.shouldShowPreSubmitWarning("red")).toBe(true);
  });

  test("useComplexitySignals throws outside provider", () => {
    expect(() => {
      renderHook(() => useComplexitySignals());
    }).toThrow(/ComplexitySignalProvider/);
  });
});
