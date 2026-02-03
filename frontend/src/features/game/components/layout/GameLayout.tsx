import type { ReactNode } from "react";

type GameLayoutProps = {
  canvas: ReactNode;
  sidebar: ReactNode;
};

export default function GameLayout({ canvas, sidebar }: GameLayoutProps) {
  const layoutContainerStyle = {
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: "60px",
    minHeight: "70vh",
    background: "linear-gradient(180deg, #0d0d0d 0%, #1a1a1a 100%)",
    color: "white",
    paddingTop: "40px",
    fontFamily: "sans-serif",
  } as const;

  return (
    <div style={layoutContainerStyle}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px",
        }}
      >
        {canvas}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "25px",
        }}
      >
        {sidebar}
      </div>
    </div>
  );
}
