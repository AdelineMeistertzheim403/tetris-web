import { useEffect, useMemo, useRef } from "react";
import { useSettings } from "../../settings/context/SettingsContext";
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
  const pressedKeysRef = useRef<Set<string>>(new Set());

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

      if (action === "hold") {
        if (e.repeat || pressedKeysRef.current.has(key)) return;
        pressedKeysRef.current.add(key);
      }

      e.preventDefault();
      cbRef.current?.(action);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = normalizeKey(e.key);
      pressedKeysRef.current.delete(key);
    };

    window.addEventListener("keydown", handler, { passive: false });
    window.addEventListener("keyup", handleKeyUp, { passive: false });
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);
}
