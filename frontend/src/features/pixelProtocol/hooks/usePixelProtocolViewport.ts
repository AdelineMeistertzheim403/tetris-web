import { useEffect, useRef, useState } from "react";
import { VIEWPORT_W, WORLD_H } from "../constants";
import { defaultViewportWorldWidth, viewportWorldWidth } from "../logic";

export function usePixelProtocolViewport() {
  const [viewportWidth, setViewportWidth] = useState(defaultViewportWorldWidth());
  const [viewportHeight, setViewportHeight] = useState(WORLD_H);
  const gameViewportRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const updateViewport = () => {
      const measuredWidth = gameViewportRef.current?.clientWidth ?? VIEWPORT_W;
      const measuredHeight = gameViewportRef.current?.clientHeight ?? WORLD_H;
      setViewportWidth(viewportWorldWidth(measuredWidth));
      setViewportHeight(measuredHeight);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => {
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  return {
    gameViewportRef,
    viewportHeight,
    viewportWidth,
  };
}
