import { useEffect, useMemo, useRef } from "react";
import { useSettings } from "../context/SettingsContext";
import type { ControlAction } from "../types/Controls";
import { normalizeKey } from "../utils/controls";

/**
 * Listener unique (window) avec callback toujours à jour.
 */
export function useKeyboardControls(onMove: (dir: ControlAction) => void) {
  const cbRef = useRef(onMove);
  const { settings } = useSettings();

  const actionMap = useMemo(() => {
    const map = new Map<string, ControlAction>();
    (Object.entries(settings.keyBindings) as [ControlAction, string][]).forEach(
      ([action, key]) => {
        if (key) map.set(key, action);
      }
    );
    return map;
  }, [settings.keyBindings]);

  const actionMapRef = useRef(actionMap);
  const holdKeyRef = useRef(normalizeKey(settings.keyBindings.hold));

  // toujours à jour
  useEffect(() => {
    cbRef.current = onMove;
  }, [onMove]);

  useEffect(() => {
    actionMapRef.current = actionMap;
  }, [actionMap]);

  useEffect(() => {
    holdKeyRef.current = normalizeKey(settings.keyBindings.hold);
  }, [settings.keyBindings.hold]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = normalizeKey(e.key);
      let action = actionMapRef.current.get(key);
      if (!action) {
        const holdKey = holdKeyRef.current;
        if ((key === "Shift" || key === "C") && (holdKey === "Shift" || holdKey === "C")) {
          action = "hold";
        }
      }
      if (!action) return;

      e.preventDefault();
      cbRef.current?.(action);
    };

    window.addEventListener("keydown", handler, { passive: false });
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
