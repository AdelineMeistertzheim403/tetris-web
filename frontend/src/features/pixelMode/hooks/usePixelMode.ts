import { useContext } from "react";
import {
  PixelModeContext,
  type PixelModeContextValue,
} from "../context/pixelModeContext";

export function usePixelMode(): PixelModeContextValue {
  const value = useContext(PixelModeContext);
  if (!value) {
    throw new Error("usePixelMode must be used within PixelModeProvider");
  }
  return value;
}
