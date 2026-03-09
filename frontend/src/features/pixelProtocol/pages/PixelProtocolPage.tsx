import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PixelProtocolControlsPanel } from "../components/PixelProtocolControlsPanel";
import { PixelProtocolInfoPanel } from "../components/PixelProtocolInfoPanel";
import { PixelProtocolWorld } from "../components/PixelProtocolWorld";
import { usePixelProtocolGame } from "../hooks/usePixelProtocolGame";
import { usePixelProtocolLevels } from "../hooks/usePixelProtocolLevels";
import { LEVELS as DEFAULT_LEVELS } from "../levels";
import {
  fetchPixelProtocolCustomLevels,
  fetchPixelProtocolProgress,
  savePixelProtocolProgress,
  type PixelProtocolProgress,
} from "../services/pixelProtocolService";
import {
  findPixelProtocolCustomLevel,
  listPixelProtocolCustomLevels,
  mergePixelProtocolCustomLevels,
} from "../utils/customLevels";
import {
  readLocalPixelProtocolProgress,
  writeLocalPixelProtocolProgress,
} from "../utils/progress";
import {
  readLocalPixelProtocolSkills,
  writeLocalPixelProtocolSkills,
} from "../utils/skills";
import "../../../styles/pixel-protocol.css";
import { useAuth } from "../../auth/context/AuthContext";
import type { LevelDef } from "../types";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function PixelProtocolPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { levels, loading, error, usingFallback } = usePixelProtocolLevels();
  const customId = searchParams.get("custom");
  const requestedLevel = Number.parseInt(searchParams.get("level") ?? "", 10);

  const [progress, setProgress] = useState<PixelProtocolProgress>(() =>
    readLocalPixelProtocolProgress()
  );
  const [unlockedSkills, setUnlockedSkills] = useState(() =>
    readLocalPixelProtocolSkills()
  );
  const [customLevels, setCustomLevels] = useState<LevelDef[]>(() =>
    listPixelProtocolCustomLevels()
  );
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const syncKeyRef = useRef<string>("");
  const finalSaveKeyRef = useRef<string>("");

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    setSyncLoading(true);

    (async () => {
      try {
        const [remoteProgress, remoteCustomLevels] = await Promise.all([
          fetchPixelProtocolProgress(),
          fetchPixelProtocolCustomLevels(),
        ]);
        if (cancelled) return;
        writeLocalPixelProtocolProgress(remoteProgress);
        setProgress(remoteProgress);
        setCustomLevels(mergePixelProtocolCustomLevels(remoteCustomLevels));
        setSyncError(null);
      } catch {
        if (cancelled) return;
        setProgress(readLocalPixelProtocolProgress());
        setCustomLevels(listPixelProtocolCustomLevels());
        setSyncError("Mode hors ligne: progression locale utilisee.");
      } finally {
        if (!cancelled) setSyncLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const hasLevels = levels.length > 0;
  const campaignLevels = hasLevels ? levels : DEFAULT_LEVELS;
  const customLevel = useMemo(() => {
    if (!customId) return null;
    return (
      customLevels.find((level) => level.id === customId) ??
      findPixelProtocolCustomLevel(customId)
    );
  }, [customId, customLevels]);
  const isCustomLevel = Boolean(customId);
  const missingCustomLevel = Boolean(customId) && !customLevel && !syncLoading;
  const gameLevels = customLevel ? [customLevel] : campaignLevels;
  const initialLevelIndex = customLevel
    ? 0
    : clamp(
        Number.isFinite(requestedLevel) && requestedLevel > 0
          ? requestedLevel - 1
          : progress.currentLevel - 1,
        0,
        Math.max(0, gameLevels.length - 1)
      );

  const {
    ability,
    chatLine,
    gameViewportRef,
    level,
    levelIndex,
    playerRunFrame,
    playerSprite,
    portalOpen,
    grapplePreview,
    resetLevel,
    runtime,
    unlockedSkills: activeSkills,
  } = usePixelProtocolGame(gameLevels, {
    initialLevelIndex,
    initialUnlockedSkills: unlockedSkills,
    onUnlockSkills: (skills) => {
      setUnlockedSkills(skills);
      writeLocalPixelProtocolSkills(skills);
    },
  });

  useEffect(() => {
    writeLocalPixelProtocolProgress(progress);
  }, [progress]);

  useEffect(() => {
    if (isCustomLevel) return;

    const reachedLevel = clamp(levelIndex + 1, 1, gameLevels.length);
    const nextProgress = {
      highestLevel: Math.max(progress.highestLevel, reachedLevel),
      currentLevel: reachedLevel,
      updatedAt: progress.updatedAt ?? null,
    };
    const syncKey = `${nextProgress.highestLevel}:${nextProgress.currentLevel}:${Boolean(user)}`;
    if (syncKeyRef.current === syncKey) return;
    syncKeyRef.current = syncKey;

    setProgress((current) => ({
      highestLevel: Math.max(current.highestLevel, nextProgress.highestLevel),
      currentLevel: Math.max(1, nextProgress.currentLevel),
      updatedAt: current.updatedAt ?? null,
    }));

    if (!user) return;

    void savePixelProtocolProgress(nextProgress)
      .then((saved) => {
        writeLocalPixelProtocolProgress(saved);
        setProgress(saved);
      })
      .catch(() => {
        setSyncError("Mode hors ligne: progression locale utilisee.");
      });
  }, [gameLevels.length, isCustomLevel, levelIndex, progress.currentLevel, progress.highestLevel, progress.updatedAt, user]);

  useEffect(() => {
    if (isCustomLevel || runtime.status !== "won") return;

    const finalLevel = gameLevels.length;
    const saveKey = `${finalLevel}:${runtime.status}:${Boolean(user)}`;
    if (finalSaveKeyRef.current === saveKey) return;
    finalSaveKeyRef.current = saveKey;

    const nextProgress = {
      highestLevel: Math.max(progress.highestLevel, finalLevel),
      currentLevel: finalLevel,
    };

    setProgress((current) => ({
      highestLevel: Math.max(current.highestLevel, nextProgress.highestLevel),
      currentLevel: Math.max(current.currentLevel, nextProgress.currentLevel),
      updatedAt: current.updatedAt ?? null,
    }));

    if (!user) return;

    void savePixelProtocolProgress(nextProgress)
      .then((saved) => {
        writeLocalPixelProtocolProgress(saved);
        setProgress(saved);
      })
      .catch(() => {
        setSyncError("Mode hors ligne: progression locale utilisee.");
      });
  }, [gameLevels.length, isCustomLevel, progress.highestLevel, runtime.status, user]);

  if (!loading && !error && !hasLevels && !customLevel) {
    return (
      <div className="pp-shell">
        <div className="pp-layout">
          <div className="pp-panel">
            <div className="pp-header">
              <h1>Pixel Protocol</h1>
              <p>Aucun niveau publie pour le moment.</p>
            </div>
            <div className="pp-infoCard">
              <p className="pp-panelTitle">Info</p>
              <p>Reviens plus tard ou ouvre l'editeur pour tes niveaux custom.</p>
            </div>
            <div className="pp-actions">
              <button type="button" onClick={() => navigate("/dashboard")}>
                Retour dashboard
              </button>
              {user && (
                <button type="button" onClick={() => navigate("/pixel-protocol/editor")}>
                  Editeur de niveaux
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (missingCustomLevel) {
    return (
      <div className="pp-shell">
        <div className="pp-layout">
          <div className="pp-panel">
            <div className="pp-header">
              <h1>Pixel Protocol</h1>
              <p>Niveau custom introuvable.</p>
            </div>
            <div className="pp-actions">
              <button type="button" onClick={() => navigate("/pixel-protocol")}>
                Retour menu
              </button>
              {user && (
                <button type="button" onClick={() => navigate("/pixel-protocol/editor")}>
                  Ouvrir l'editeur
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pp-shell">
      <div className="pp-layout">
        <PixelProtocolInfoPanel
          ability={ability}
          unlockedSkills={activeSkills}
          chatLine={chatLine}
          level={level}
          message={runtime.message}
          collected={runtime.collected}
          hp={runtime.player.hp}
        />

        <PixelProtocolWorld
          gameViewportRef={gameViewportRef}
          level={level}
          playerRunFrame={playerRunFrame}
          playerSprite={playerSprite}
          portalOpen={portalOpen}
          grapplePreview={grapplePreview}
          runtime={runtime}
        />

        <PixelProtocolControlsPanel
          ability={ability}
          onReset={resetLevel}
          onExit={() => navigate("/pixel-protocol")}
          onEditor={user ? () => navigate("/pixel-protocol/editor") : undefined}
          statusMessage={
            loading || syncLoading
              ? "Chargement des niveaux..."
              : syncError || error || usingFallback
                ? syncError ?? "Serveur indisponible, niveaux locaux utilises."
                : isCustomLevel
                  ? "Lecture d'un niveau custom utilisateur."
                  : `Progression: ${progress.currentLevel}/${gameLevels.length}`
          }
        />
      </div>
    </div>
  );
}
