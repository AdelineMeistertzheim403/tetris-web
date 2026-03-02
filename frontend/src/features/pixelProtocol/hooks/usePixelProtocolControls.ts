import { useCallback, useEffect, useRef } from "react";
import type { InputSnapshot } from "../types";

export function usePixelProtocolControls() {
  const keysRef = useRef<Set<string>>(new Set());
  const justPressedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!keysRef.current.has(e.code)) justPressedRef.current.add(e.code);
      keysRef.current.add(e.code);
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const readInput = useCallback(
    (): InputSnapshot => ({
      left: keysRef.current.has("ArrowLeft") || keysRef.current.has("KeyA"),
      right: keysRef.current.has("ArrowRight") || keysRef.current.has("KeyD"),
      wantJump:
        justPressedRef.current.has("Space") ||
        justPressedRef.current.has("ArrowUp") ||
        justPressedRef.current.has("KeyW"),
      wantDash:
        justPressedRef.current.has("ShiftLeft") ||
        justPressedRef.current.has("ShiftRight"),
      wantHack: justPressedRef.current.has("KeyE"),
      wantRespawn: justPressedRef.current.has("KeyR"),
    }),
    []
  );

  const clearJustPressed = useCallback(() => {
    justPressedRef.current.clear();
  }, []);

  return {
    clearJustPressed,
    readInput,
  };
}
