import { createContext } from "react";

export type PixelRuntimeEvent = {
  id: number;
  sourceLabel: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
};

export type PixelRuntimeEventInput = Omit<PixelRuntimeEvent, "id"> & {
  ttlMs?: number;
};

export type PixelModeContextValue = {
  enabled: boolean;
  unlocked: boolean;
  gameplayRouteActive: boolean;
  instabilityLevel: number;
  runCount: number;
  activeRuntimeEvent: PixelRuntimeEvent | null;
  reportRuntimeEvent: (event: PixelRuntimeEventInput) => void;
  setEnabled: (next: boolean) => void;
  toggle: () => void;
};

export const PixelModeContext = createContext<PixelModeContextValue | null>(null);
