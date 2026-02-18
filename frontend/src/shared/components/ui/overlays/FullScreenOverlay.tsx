// Composant UI FullScreenOverlay.tsx.
import type { CSSProperties, ReactNode } from "react";

type FullScreenOverlayProps = {
  show: boolean;
  children: ReactNode;
  backgroundColor?: string;
  style?: CSSProperties;
};

export default function FullScreenOverlay({
  show,
  children,
  backgroundColor = "rgba(0,0,0,0.8)",
  style,
}: FullScreenOverlayProps) {
  if (!show) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
