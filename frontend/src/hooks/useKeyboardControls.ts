import { useEffect, useRef } from "react";

export type Direction = "left" | "right" | "down" | "rotate" | "harddrop" | "hold" | "bomb" | "freeze";

/**
 * Listener unique (window) avec callback toujours à jour.
 */
export function useKeyboardControls(onMove: (dir: Direction) => void) {
  const cbRef = useRef(onMove);

  // toujours à jour
  useEffect(() => {
    cbRef.current = onMove;
  }, [onMove]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "ArrowDown" ||
        e.key === "ArrowUp" ||
        e.key === " " ||
        e.key === "b" ||
        e.key === "f"
      ) {
        e.preventDefault();
      }

      switch (e.key) {
        case "ArrowLeft":
          cbRef.current?.("left");
          break;
        case "ArrowRight":
          cbRef.current?.("right");
          break;
        case "ArrowDown":
          cbRef.current?.("down");
          break;
        case "ArrowUp":
          cbRef.current?.("rotate");
          break;
        case " ":
          cbRef.current?.("harddrop");
          break;
        case "Shift":
        case "c":
        case "C":
          cbRef.current?.("hold");
          break;
        case "b":
        case "B":
          cbRef.current?.("bomb");
          break;
        case "f":
        case "F":
          cbRef.current?.("freeze");
          break;
      }
    };

    window.addEventListener("keydown", handler, { passive: false });
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
