import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSettings } from "../../settings/context/SettingsContext";
import { getModeKeyBindings, normalizeKey } from "../../game/utils/controls";
import type { InputSnapshot } from "../types";

export function usePixelProtocolControls() {
  const { settings } = useSettings();
  const keysRef = useRef<Set<string>>(new Set());
  const justPressedRef = useRef<Set<string>>(new Set());
  const keyBindings = useMemo(
    () => getModeKeyBindings(settings, "PIXEL_PROTOCOL"),
    [settings.keyBindings, settings.modeKeyBindings]
  );

  useEffect(() => {
    const trackedKeys = new Set(Object.values(keyBindings));

    const down = (event: KeyboardEvent) => {
      const key = normalizeKey(event.key);
      if (!trackedKeys.has(key)) return;
      event.preventDefault();
      if (!keysRef.current.has(key)) justPressedRef.current.add(key);
      keysRef.current.add(key);
    };
    const up = (event: KeyboardEvent) => {
      const key = normalizeKey(event.key);
      if (!trackedKeys.has(key)) return;
      event.preventDefault();
      keysRef.current.delete(key);
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [keyBindings]);

  const readInput = useCallback(
    (): InputSnapshot => ({
      left: keysRef.current.has(keyBindings.left),
      right: keysRef.current.has(keyBindings.right),
      up: keysRef.current.has(keyBindings.up),
      down: keysRef.current.has(keyBindings.down),
      wantJump: justPressedRef.current.has(keyBindings.jump),
      wantDash: justPressedRef.current.has(keyBindings.dash),
      wantHack: justPressedRef.current.has(keyBindings.hack),
      wantGrapple: justPressedRef.current.has(keyBindings.grapple),
      wantPhaseShift: justPressedRef.current.has(keyBindings.phaseShift),
      wantPulseShock: justPressedRef.current.has(keyBindings.pulseShock),
      wantOverclock: justPressedRef.current.has(keyBindings.overclock),
      wantTimeBuffer: justPressedRef.current.has(keyBindings.timeBuffer),
      wantPlatformSpawn: justPressedRef.current.has(keyBindings.platformSpawn),
      wantRespawn: justPressedRef.current.has(keyBindings.respawn),
    }),
    [keyBindings]
  );

  const clearJustPressed = useCallback(() => {
    justPressedRef.current.clear();
  }, []);

  return {
    clearJustPressed,
    readInput,
  };
}
