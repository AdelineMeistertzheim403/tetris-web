import { useEffect, useRef, useState } from "react";
import { VIEWPORT_W, WORLD_H } from "../constants";
import { defaultViewportWorldWidth, viewportWorldWidth } from "../logic";

export function usePixelProtocolViewport() {
  const [viewportWidth, setViewportWidth] = useState(defaultViewportWorldWidth());
  const [viewportHeight, setViewportHeight] = useState(WORLD_H);
  const gameViewportRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const updateViewport = () => {
      const bounds = gameViewportRef.current?.getBoundingClientRect();
      const measuredWidth = bounds?.width ?? gameViewportRef.current?.clientWidth ?? VIEWPORT_W;
      const measuredHeight =
        bounds?.height ?? gameViewportRef.current?.clientHeight ?? WORLD_H;
      setViewportWidth(viewportWorldWidth(measuredWidth));
      setViewportHeight(measuredHeight);
    };

    updateViewport();
    const observedElement = gameViewportRef.current;
    const resizeObserver =
      observedElement && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            updateViewport();
          })
        : null;

    if (resizeObserver && observedElement) {
      resizeObserver.observe(observedElement);
    }
    window.addEventListener("resize", updateViewport);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  return {
    gameViewportRef,
    viewportHeight,
    viewportWidth,
  };
}
