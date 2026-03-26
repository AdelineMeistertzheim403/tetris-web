import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useSettings } from "../../settings/context/SettingsContext";
import { usePixelMode } from "../hooks/usePixelMode";
import { corruptText, PIXEL_MODE_MAX_INSTABILITY, PIXEL_MODE_RUNTIME_LINES } from "../logic/pixelMode";

export default function PixelModeViewport() {
  const { settings } = useSettings();
  const location = useLocation();
  const { gameplayRouteActive, instabilityLevel, runCount, activeRuntimeEvent } = usePixelMode();
  const [glitchActive, setGlitchActive] = useState(false);
  const [activeLine, setActiveLine] = useState<string | null>(null);
  const performanceSensitiveRoute = location.pathname === "/pixel-invasion";

  useEffect(() => {
    if (!gameplayRouteActive) {
      setGlitchActive(false);
      return;
    }

    const interval = window.setInterval(() => {
      const threshold = settings.reducedMotion
        ? 0.16
        : performanceSensitiveRoute
          ? 0.18 + instabilityLevel * 0.025
          : 0.34 + instabilityLevel * 0.05;
      setGlitchActive(Math.random() < Math.min(performanceSensitiveRoute ? 0.34 : 0.72, threshold));
    }, settings.reducedMotion ? 850 : performanceSensitiveRoute ? 540 : 320);

    return () => window.clearInterval(interval);
  }, [gameplayRouteActive, instabilityLevel, performanceSensitiveRoute, settings.reducedMotion]);

  useEffect(() => {
    if (!gameplayRouteActive) {
      setActiveLine(null);
      return;
    }

    let hideTimeout: number | null = null;
    const showLine = () => {
      setActiveLine(
        PIXEL_MODE_RUNTIME_LINES[
          Math.floor(Math.random() * PIXEL_MODE_RUNTIME_LINES.length)
        ] ?? PIXEL_MODE_RUNTIME_LINES[0]
      );
      if (hideTimeout) {
        window.clearTimeout(hideTimeout);
      }
      hideTimeout = window.setTimeout(() => setActiveLine(null), 3600);
    };

    showLine();
    const interval = window.setInterval(showLine, 10_500);

    return () => {
      if (hideTimeout) {
        window.clearTimeout(hideTimeout);
      }
      window.clearInterval(interval);
    };
  }, [gameplayRouteActive]);

  const displayedLine = useMemo(() => {
    const baseLine = activeRuntimeEvent?.description ?? activeLine;
    if (!baseLine) return null;
    return corruptText(
      baseLine,
      settings.reducedMotion
        ? 0.04
        : performanceSensitiveRoute
          ? Math.min(0.12, 0.04 + instabilityLevel * 0.012)
          : Math.min(0.2, 0.06 + instabilityLevel * 0.02)
    );
  }, [activeLine, activeRuntimeEvent, instabilityLevel, performanceSensitiveRoute, settings.reducedMotion]);

  if (!gameplayRouteActive) return null;

  return (
    <>
      <div
        className={`pixel-mode-overlay${glitchActive ? " pixel-mode-overlay--active" : ""}${
          performanceSensitiveRoute ? " pixel-mode-overlay--performance" : ""
        }`}
        aria-hidden="true"
      />
      <div className="pixel-mode-hud" aria-live="polite">
        <p className="pixel-mode-hud__eyebrow">COUCHE PROFONDE // MODE PIXEL</p>
        <div className="pixel-mode-hud__meter">
          <span
            className="pixel-mode-hud__meter-fill"
            style={{ width: `${(instabilityLevel / PIXEL_MODE_MAX_INSTABILITY) * 100}%` }}
          />
        </div>
        <p className="pixel-mode-hud__meta">
          Instabilite {instabilityLevel}/{PIXEL_MODE_MAX_INSTABILITY} · cycles {runCount}
        </p>
        <p className="pixel-mode-hud__warning">Run corrompue · hors classement</p>
      </div>
      {displayedLine ? (
        <div
          className={`pixel-mode-message${
            activeRuntimeEvent ? " pixel-mode-message--event" : ""
          }${activeRuntimeEvent ? ` pixel-mode-message--${activeRuntimeEvent.severity}` : ""}`}
          aria-live="polite"
        >
          <img
            src="/Tetromaze/hacker_pixel.png"
            alt="Pixel"
            className="pixel-mode-message__avatar"
            loading="lazy"
          />
          <div className="pixel-mode-message__body">
            <p className="pixel-mode-message__name">
              PIXEL
              {activeRuntimeEvent ? (
                <span className="pixel-mode-message__tag">{activeRuntimeEvent.sourceLabel}</span>
              ) : null}
            </p>
            {activeRuntimeEvent ? (
              <p className="pixel-mode-message__title">{activeRuntimeEvent.title}</p>
            ) : null}
            <p className="pixel-mode-message__text">{displayedLine}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
