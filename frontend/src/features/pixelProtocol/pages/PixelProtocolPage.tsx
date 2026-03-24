import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PixelProtocolControlsPanel } from "../components/PixelProtocolControlsPanel";
import { PixelProtocolInfoPanel } from "../components/PixelProtocolInfoPanel";
import { PixelProtocolWorld } from "../components/PixelProtocolWorld";
import { usePixelProtocolGame } from "../hooks/usePixelProtocolGame";
import { usePixelProtocolLevels } from "../hooks/usePixelProtocolLevels";
import { LEVELS as DEFAULT_LEVELS } from "../levels";
import {
  fetchPixelProtocolCommunityLevel,
  fetchPixelProtocolCustomLevels,
  fetchPixelProtocolProgress,
  recordPixelProtocolCommunityLevelPlay,
  savePixelProtocolProgress,
  togglePixelProtocolCommunityLevelLike,
  type PixelProtocolCommunityLevel,
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
import { markPixelProtocolCustomLevelCompleted as markCompletedCustomLevel } from "../utils/communityCompletion";
import {
  readLocalPixelProtocolSkills,
  writeLocalPixelProtocolSkills,
} from "../utils/skills";
import { listPixelProtocolWorldTemplates } from "../utils/worldTemplates";
import {
  resolveLevelWorldTemplate,
  resolveLevelsWorldTemplates,
} from "../utils/resolveWorldTemplate";
import "../../../styles/pixel-protocol.css";
import { useAuth } from "../../auth/context/AuthContext";
import { useAchievements } from "../../achievements/hooks/useAchievements";
import type { LevelDef } from "../types";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function PixelProtocolPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { checkAchievements, updateStats, recordPlayerBehavior, recordTetrobotEvent } =
    useAchievements();
  const [searchParams] = useSearchParams();
  const { levels, loading, error, usingFallback } = usePixelProtocolLevels();
  const customId = searchParams.get("custom");
  const requestedLevelId = searchParams.get("levelId");
  const requestedCommunityId = Number.parseInt(searchParams.get("community") ?? "", 10);
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
  const [communityLevel, setCommunityLevel] = useState<PixelProtocolCommunityLevel | null>(null);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityError, setCommunityError] = useState<string | null>(null);
  const [communityLikeBusy, setCommunityLikeBusy] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const syncKeyRef = useRef<string>("");
  const customCompletionKeyRef = useRef<string>("");
  const countedCommunityPlayRef = useRef<string>("");
  const countedPortalRef = useRef<string>("");
  const countedCampaignWinRef = useRef<string>("");
  const countedBehaviorOutcomeRef = useRef<string>("");
  const previousCollectedRef = useRef(0);

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
        setCustomLevels(
          resolveLevelsWorldTemplates(
            mergePixelProtocolCustomLevels(remoteCustomLevels),
            listPixelProtocolWorldTemplates()
          )
        );
        setSyncError(null);
      } catch {
        if (cancelled) return;
        setProgress(readLocalPixelProtocolProgress());
        setCustomLevels(
          resolveLevelsWorldTemplates(
            listPixelProtocolCustomLevels(),
            listPixelProtocolWorldTemplates()
          )
        );
        setSyncError("Mode hors ligne: progression locale utilisee.");
      } finally {
        if (!cancelled) setSyncLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!Number.isFinite(requestedCommunityId) || requestedCommunityId <= 0) {
      setCommunityLevel(null);
      setCommunityError(null);
      setCommunityLoading(false);
      setCommunityLikeBusy(false);
      return;
    }

    let cancelled = false;
    setCommunityLoading(true);
    setCommunityError(null);

    void fetchPixelProtocolCommunityLevel(requestedCommunityId)
      .then((level) => {
        if (cancelled) return;
        setCommunityLevel(level);
      })
      .catch((err) => {
        if (cancelled) return;
        setCommunityLevel(null);
        setCommunityError(err instanceof Error ? err.message : "Niveau joueur introuvable");
      })
      .finally(() => {
        if (!cancelled) setCommunityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [requestedCommunityId]);

  const hasLevels = levels.length > 0;
  const campaignLevels = hasLevels
    ? levels
    : resolveLevelsWorldTemplates(DEFAULT_LEVELS, listPixelProtocolWorldTemplates());
  const customLevel = useMemo(() => {
    if (!customId) return null;
    return resolveLevelWorldTemplate(
      customLevels.find((level) => level.id === customId) ??
        findPixelProtocolCustomLevel(customId),
      listPixelProtocolWorldTemplates()
    );
  }, [customId, customLevels]);
  const localLevel = useMemo(() => {
    if (!requestedLevelId) return null;
    return resolveLevelWorldTemplate(
      DEFAULT_LEVELS.find((item) => item.id === requestedLevelId) ?? null,
      listPixelProtocolWorldTemplates()
    );
  }, [requestedLevelId]);
  const isCustomLevel = Boolean(customId);
  const isLocalLevel = Boolean(localLevel);
  const isCommunityLevel = Boolean(
    Number.isFinite(requestedCommunityId) && requestedCommunityId > 0
  );
  const missingCustomLevel = Boolean(customId) && !customLevel && !syncLoading;
  const missingCommunityLevel = isCommunityLevel && !communityLevel && !communityLoading;
  const gameLevels = communityLevel
    ? [communityLevel.level]
    : customLevel
      ? [customLevel]
      : localLevel
        ? [localLevel]
        : campaignLevels;
  const initialLevelIndex = customLevel
    ? 0
    : localLevel
      ? 0
    : clamp(
        Number.isFinite(requestedLevel) && requestedLevel > 0
          ? requestedLevel - 1
          : progress.currentLevel - 1,
        0,
        Math.max(0, gameLevels.length - 1)
      );

  const {
    advanceLevel,
    ability,
    chatLine,
    gameViewportRef,
    hasNextLevel,
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
    if (isCustomLevel || isCommunityLevel || isLocalLevel) return;

    const reachedLevel = clamp(
      levelIndex + (runtime.status === "won" ? 2 : 1),
      1,
      gameLevels.length
    );
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
  }, [gameLevels.length, isCommunityLevel, isCustomLevel, isLocalLevel, levelIndex, progress.currentLevel, progress.highestLevel, progress.updatedAt, runtime.status, user]);

  useEffect(() => {
    if (!isCustomLevel || runtime.status !== "won" || !customLevel) return;

    const completionKey = `${customLevel.id}:${runtime.status}`;
    if (customCompletionKeyRef.current === completionKey) return;
    customCompletionKeyRef.current = completionKey;
    markCompletedCustomLevel(customLevel);
  }, [customLevel, isCustomLevel, runtime.status]);

  const handleCommunityLike = async () => {
    if (!user || !communityLevel || communityLevel.isOwn || communityLikeBusy) return;
    setCommunityLikeBusy(true);
    try {
      const result = await togglePixelProtocolCommunityLevelLike(communityLevel.id);
      if (result.liked && !communityLevel.likedByMe) {
        const next = updateStats((prev) => ({
          ...prev,
          counters: {
            ...prev.counters,
            likes_given: (prev.counters.likes_given ?? 0) + 1,
          },
        }));
        checkAchievements({
          mode: "PIXEL_PROTOCOL",
          counters: {
            likes_given: next.counters.likes_given,
          },
        });
      }
      setCommunityLevel({
        ...communityLevel,
        likedByMe: result.liked,
        likeCount: result.likeCount,
      });
      setCommunityError(null);
    } catch (err) {
      setCommunityError(err instanceof Error ? err.message : "Vote impossible");
    } finally {
      setCommunityLikeBusy(false);
    }
  };

  const endScreen =
    runtime.status === "lost"
      ? {
          title: "Signal perdu",
          subtitle:
            isCommunityLevel
              ? "Le niveau joueur t'a desynchronise. Tu peux relancer une tentative ou revenir a la galerie."
              : "Pixel n'a plus de vie. Relance une tentative ou retourne au hub.",
        }
      : runtime.status === "won"
        ? {
            title: isCommunityLevel ? "Transmission complete" : "Secteur stabilise",
            subtitle: isCommunityLevel
              ? `Niveau termine${communityLevel ? ` par ${communityLevel.authorPseudo}` : ""}.`
              : isCustomLevel
                ? "Ton niveau custom est complete."
                : isLocalLevel
                  ? "Le niveau de test est complete."
                  : levelIndex >= gameLevels.length - 1
                    ? "Campagne terminee."
                    : null,
          }
        : null;

  useEffect(() => {
    if (!isCommunityLevel || !communityLevel) return;
    const playKey = String(communityLevel.id);
    if (countedCommunityPlayRef.current === playKey) return;
    countedCommunityPlayRef.current = playKey;
    const next = updateStats((prev) => ({
      ...prev,
      counters: {
        ...prev.counters,
        community_levels_played: (prev.counters.community_levels_played ?? 0) + 1,
      },
    }));
    checkAchievements({
      mode: "PIXEL_PROTOCOL",
      counters: {
        community_levels_played: next.counters.community_levels_played,
      },
    });
    void recordPixelProtocolCommunityLevelPlay(communityLevel.id)
      .then((result) => {
        setCommunityLevel((current) =>
          current && current.id === communityLevel.id
            ? {
                ...current,
                playCount: result.playCount,
              }
            : current
        );
      })
      .catch(() => {});
  }, [checkAchievements, communityLevel, isCommunityLevel, updateStats]);

  useEffect(() => {
    const diff = runtime.collected - previousCollectedRef.current;
    previousCollectedRef.current = runtime.collected;
    if (diff <= 0) return;
    const next = updateStats((prev) => ({
      ...prev,
      counters: {
        ...prev.counters,
        data_orbs_collected: (prev.counters.data_orbs_collected ?? 0) + diff,
      },
    }));
    checkAchievements({
      mode: "PIXEL_PROTOCOL",
      counters: {
        data_orbs_collected: next.counters.data_orbs_collected,
      },
    });
  }, [checkAchievements, runtime.collected, updateStats]);

  useEffect(() => {
    if (runtime.status !== "won") return;
    const levelKey = isCommunityLevel
      ? `community:${communityLevel?.id ?? "unknown"}`
      : isCustomLevel
        ? `custom:${customLevel?.id ?? level.id}`
        : `campaign:${level.id}`;
    const winKey = `${levelKey}:${Math.round(runtime.startedAt)}`;
    if (countedPortalRef.current === winKey) return;
    countedPortalRef.current = winKey;
    const next = updateStats((prev) => ({
      ...prev,
      counters: {
        ...prev.counters,
        portals_opened: (prev.counters.portals_opened ?? 0) + 1,
      },
    }));
    checkAchievements({
      mode: "PIXEL_PROTOCOL",
      counters: {
        portals_opened: next.counters.portals_opened,
      },
    });
  }, [
    checkAchievements,
    communityLevel?.id,
    customLevel?.id,
    isCommunityLevel,
    isCustomLevel,
    level.id,
    runtime.status,
    updateStats,
  ]);

  useEffect(() => {
    if (runtime.status !== "won" || isCommunityLevel || isCustomLevel || isLocalLevel) return;

    const winKey = `campaign:${level.id}:${Math.round(runtime.startedAt)}`;
    if (countedCampaignWinRef.current === winKey) return;
    countedCampaignWinRef.current = winKey;

    const next = updateStats((prev) => ({
      ...prev,
      counters: {
        ...prev.counters,
        campaign_level_complete: (prev.counters.campaign_level_complete ?? 0) + 1,
        no_damage_level_count:
          (prev.counters.no_damage_level_count ?? 0) + (runtime.player.hp >= 3 ? 1 : 0),
      },
    }));

    if (runtime.player.hp >= 3) {
      recordTetrobotEvent({ type: "rookie_tip_followed" });
    }
    if (next.counters.campaign_level_complete === 1 || runtime.player.hp >= 3) {
      recordTetrobotEvent({ type: "pulse_advice_success" });
    }

    checkAchievements({
      mode: "PIXEL_PROTOCOL",
      counters: {
        campaign_level_complete: next.counters.campaign_level_complete,
      },
      custom: {
        no_damage_level: runtime.player.hp >= 3,
      },
    });
  }, [
    checkAchievements,
    isCommunityLevel,
    isCustomLevel,
    isLocalLevel,
    level.id,
    recordTetrobotEvent,
    runtime.player.hp,
    runtime.startedAt,
    runtime.status,
    updateStats,
  ]);

  useEffect(() => {
    if (runtime.status !== "won" && runtime.status !== "lost") return;

    const levelKey = isCommunityLevel
      ? `community:${communityLevel?.id ?? "unknown"}`
      : isCustomLevel
        ? `custom:${customLevel?.id ?? level.id}`
        : `campaign:${level.id}`;
    const outcomeKey = `${levelKey}:${runtime.status}:${Math.round(runtime.startedAt)}`;
    if (countedBehaviorOutcomeRef.current === outcomeKey) return;
    countedBehaviorOutcomeRef.current = outcomeKey;

    recordPlayerBehavior({
      mode: "PIXEL_PROTOCOL",
      won: runtime.status === "won",
      durationMs: runtime.startedAt ? Math.max(0, Date.now() - runtime.startedAt) : undefined,
      mistakes: [
        ...(runtime.player.hp < runtime.player.maxHealth ? (["damage_taken"] as const) : []),
        ...(runtime.status === "lost" ? (["top_out"] as const) : []),
        ...(runtime.startedAt && Date.now() - runtime.startedAt > 90_000
          ? (["slow"] as const)
          : []),
      ],
      runContext: {
        livesRemaining: runtime.player.hp,
        pressureScore: Math.round(
          Math.min(
            100,
            ((runtime.player.maxHealth - runtime.player.hp) / Math.max(1, runtime.player.maxHealth)) *
              70 + (runtime.status === "lost" ? 20 : 10)
          )
        ),
        stageIndex: levelIndex + 1,
      },
    });
  }, [
    communityLevel?.id,
    customLevel?.id,
    isCommunityLevel,
    isCustomLevel,
    level.id,
    levelIndex,
    recordPlayerBehavior,
    runtime.player.hp,
    runtime.player.maxHealth,
    runtime.startedAt,
    runtime.status,
  ]);

  if (isCommunityLevel && communityLoading) {
    return (
      <div className="pp-shell">
        <div className="pp-layout">
          <div className="pp-panel">
            <div className="pp-header">
              <h1>Pixel Protocol</h1>
              <p>Chargement du niveau joueur...</p>
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

  if (missingCommunityLevel) {
    return (
      <div className="pp-shell">
        <div className="pp-layout">
          <div className="pp-panel">
            <div className="pp-header">
              <h1>Pixel Protocol</h1>
              <p>{communityError ?? "Niveau joueur introuvable."}</p>
            </div>
            <div className="pp-actions">
              <button type="button" onClick={() => navigate("/pixel-protocol")}>
                Retour menu
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          health={runtime.player.health}
          maxHealth={runtime.player.maxHealth}
        />

        <div className="pp-stage">
          <PixelProtocolWorld
            gameViewportRef={gameViewportRef}
            level={level}
            playerRunFrame={playerRunFrame}
            playerSprite={playerSprite}
            portalOpen={portalOpen}
            grapplePreview={grapplePreview}
            runtime={runtime}
          />
          {endScreen && (
            <div className="pp-endScreen" role="dialog" aria-modal="true" aria-labelledby="pp-end-title">
              <div className="pp-endScreen__card">
                <p className="pp-endScreen__eyebrow">
                  {runtime.status === "won" ? "Mission terminee" : "Execution interrompue"}
                </p>
                <h2 id="pp-end-title" className="pp-endScreen__title">
                  {endScreen.title}
                </h2>
                {endScreen.subtitle && (
                  <p className="pp-endScreen__text">{endScreen.subtitle}</p>
                )}
                {isCommunityLevel && communityLevel && runtime.status === "won" && (
                  <p className="pp-endScreen__meta">
                    Niveau joueur #{communityLevel.id} · {communityLevel.likeCount} like
                    {communityLevel.likeCount > 1 ? "s" : ""}
                  </p>
                )}
                {runtime.status === "lost" && (
                  <p className="pp-endScreen__meta">Dernier message: {runtime.message}</p>
                )}
                <div className="pp-endScreen__actions">
                  {!isCommunityLevel &&
                    !isCustomLevel &&
                    !isLocalLevel &&
                    runtime.status === "won" &&
                    hasNextLevel && (
                      <button
                        type="button"
                        className="pp-endScreen__action pp-endScreen__action--next"
                        onClick={advanceLevel}
                      >
                        <i className="fa-solid fa-forward" aria-hidden="true" />
                        <span>Niveau suivant</span>
                      </button>
                    )}
                  <button
                    type="button"
                    className="pp-endScreen__action pp-endScreen__action--replay"
                    onClick={resetLevel}
                  >
                    <i className="fa-solid fa-rotate-right" aria-hidden="true" />
                    <span>Rejouer</span>
                  </button>
                  {isCommunityLevel && communityLevel && runtime.status === "won" && (
                    <button
                      type="button"
                      className={`pp-endScreen__action pp-endScreen__action--like ${
                        communityLevel.likedByMe ? "is-active" : ""
                      }`}
                      onClick={() => void handleCommunityLike()}
                      disabled={!user || communityLevel.isOwn || communityLikeBusy}
                    >
                      <i
                        className={`fa-solid ${
                          communityLevel.likedByMe ? "fa-heart-crack" : "fa-heart"
                        }`}
                        aria-hidden="true"
                      />
                      <span>
                        {communityLevel.isOwn
                          ? "Ton niveau"
                          : communityLevel.likedByMe
                            ? "Retirer like"
                            : "Liker"}
                      </span>
                    </button>
                  )}
                  {isCommunityLevel ? (
                    <button
                      type="button"
                      className="pp-endScreen__action pp-endScreen__action--gallery"
                      onClick={() => navigate("/pixel-protocol/community")}
                    >
                      <i className="fa-solid fa-users" aria-hidden="true" />
                      <span>Galerie</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="pp-endScreen__action pp-endScreen__action--exit"
                      onClick={() => navigate("/pixel-protocol")}
                    >
                      <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                      <span>Retour hub</span>
                    </button>
                  )}
                </div>
                {isCommunityLevel && communityError && (
                  <p className="pp-endScreen__error">{communityError}</p>
                )}
              </div>
            </div>
          )}
        </div>

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
                : isCommunityLevel
                  ? communityLoading
                    ? "Chargement du niveau joueur..."
                    : `Niveau joueur par ${communityLevel?.authorPseudo ?? "inconnu"}`
                : isCustomLevel
                  ? "Lecture d'un niveau custom utilisateur."
                  : `Progression: ${progress.currentLevel}/${gameLevels.length}`
          }
        />
      </div>
    </div>
  );
}
