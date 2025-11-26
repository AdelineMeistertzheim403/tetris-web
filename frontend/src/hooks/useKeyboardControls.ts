import { useEffect, useRef } from "react";

export type Direction = "left" | "right" | "down" | "rotate" | "harddrop" | "hold";

/**
 * Ajoute un unique listener document-level, non-passif,
 * et pointe toujours vers le dernier callback via un ref.
 */
export function useKeyboardControls(onMove: (dir: Direction) => void) {
  const cbRef = useRef(onMove);
  cbRef.current = onMove; // toujours à jour

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Empêche le scroll de la page avec les flèches
      if (
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "ArrowDown" ||
        e.key === "ArrowUp"
      ) {
        e.preventDefault();
      }

      switch (e.key) {
        case "ArrowLeft":
          cbRef.current("left");
          break;
        case "ArrowRight":
          cbRef.current("right");
          break;
        case "ArrowDown":
          cbRef.current("down");
          break;
        case "ArrowUp":
          cbRef.current("rotate");
          break;
        case " ":
          e.preventDefault();
          cbRef.current("harddrop");
          break;
        case "Shift":
        case "c":
        case "C":
          cbRef.current("hold");
          break;
      }
    };

    // passive:false pour autoriser preventDefault()
    document.addEventListener("keydown", handler, { passive: false });
    return () => document.removeEventListener("keydown", handler);
  }, []);
}
