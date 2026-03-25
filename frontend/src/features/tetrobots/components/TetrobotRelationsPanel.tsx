import { useEffect } from "react";
import { Link } from "react-router-dom";
import type { BotMemoryEntry, TetrobotId } from "../../achievements/types/tetrobots";
import { getApexTrustState } from "../../achievements/lib/tetrobotAchievementLogic";
import {
  useAchievements,
} from "../../achievements/hooks/useAchievements";
import {
  TETROBOT_MODE_LABELS,
  TETROBOT_MODE_PLAY_ROUTE_MAP,
  TETROBOT_RELATION_META,
} from "../data/tetrobotsContent";
import { getApexRequirement } from "../logic/apexTrustEngine";
import ApexLockedPanel from "./ApexLockedPanel";
import TetrobotCard, { type TetrobotRelationProgressItem } from "./TetrobotCard";
import { PATHS } from "../../../routes/paths";

type RelationsStats = ReturnType<typeof useAchievements>["stats"];

function formatLockedAdvice(lockedAdvice: string[]) {
  return lockedAdvice
    .map((entry) => {
      switch (entry) {
        case "hard_truths":
          return "verites dures";
        case "punishing_challenges":
          return "defis punitifs";
        case "comforting_routes":
          return "routes rassurantes";
        case "reassurance_loops":
          return "boucles de reassurance";
        case "broad_reassurance":
          return "conseils larges";
        case "micro_analysis":
          return "micro-analyse";
        case "precision_breakdowns":
          return "decompositions precises";
        case "optimization_detours":
          return "detours d'optimisation";
        default:
          return entry;
      }
    })
    .join(", ");
}

function getStatusLabel(bot: TetrobotId, affinity: number) {
  if (bot === "rookie") {
    if (affinity >= 50) return "Confiance en construction";
    if (affinity >= 10) return "Soutien prudent";
    if (affinity <= -30) return "Inquiet et decu";
    return "Observation douce";
  }
  if (bot === "pulse") {
    if (affinity >= 50) return "Analyse avancee active";
    if (affinity >= 10) return "Analyse active";
    if (affinity <= -30) return "Evaluation critique";
    return "Lecture neutre";
  }
  if (affinity >= 50) return "Respect gagne";
  if (affinity >= 10) return "Interet naissant";
  if (affinity <= -60) return "Defiance totale";
  if (affinity <= -30) return "Defiance";
  return "Jugement froid";
}

function getThought(
  bot: TetrobotId,
  affinity: number,
  memories: BotMemoryEntry[],
  stats: RelationsStats
) {
  const latest = memories[0]?.text;
  const recommendation = stats.playerLongTermMemory.activeRecommendations[bot];
  const targetMode = recommendation?.targetMode ? getModeLabel(recommendation.targetMode) : null;
  const targetProfile = recommendation?.targetMode
    ? stats.playerLongTermMemory.modeProfiles[recommendation.targetMode]
    : null;
  const targetPattern = recommendation?.targetMode
    ? stats.playerLongTermMemory.contextualMistakePatterns[recommendation.targetMode]?.[0]
    : null;
  const oppositionLine = getOppositionLine(bot, stats);
  const activeConflict = stats.playerLongTermMemory.activeConflict;
  const activeExclusiveAlignment = stats.playerLongTermMemory.activeExclusiveAlignment;
  const resentment = stats.playerLongTermMemory.lingeringResentment[bot] ?? 0;
  if (activeExclusiveAlignment?.blockedBot === bot) {
    return `${activeExclusiveAlignment.blockedLine} Conseils verrouilles: ${formatLockedAdvice(activeExclusiveAlignment.lockedAdvice)}.`;
  }
  if (activeExclusiveAlignment?.favoredBot === bot) {
    return `${activeExclusiveAlignment.favoredLine} ${oppositionLine ?? ""}`.trim();
  }
  if (resentment > 0) {
    return `${TETROBOT_RELATION_META[bot].name} n'a pas completement tourne la page. Rancune residuelle: ${resentment} session(s).`;
  }
  if (bot === "rookie") {
    if (
      activeConflict &&
      activeConflict.resolvedAt === null &&
      (activeConflict.challenger === "rookie" || activeConflict.opponent === "rookie")
    ) {
      return activeConflict.summary;
    }
    if (recommendation && targetMode) {
      return (
        latest ??
        `Rookie attend plus de regularite: il veut te revoir sur ${targetMode}. Stabilite ${targetProfile?.resourceStability ?? 0}/100, recovery ${targetProfile?.recoveryScore ?? 0}/100.${oppositionLine ? ` ${oppositionLine}` : ""}`
      );
    }
    if (affinity >= 50) return latest ?? "Tu reviens apres tes echecs. Rookie y voit de la vraie perseverance.";
    if (affinity <= -30) return latest ?? "Rookie pense que tu abandonnes trop vite quand la pression monte.";
    return latest ?? "Rookie observe encore ta maniere d'apprendre.";
  }
  if (bot === "pulse") {
    if (
      activeConflict &&
      activeConflict.resolvedAt === null &&
      (activeConflict.challenger === "pulse" || activeConflict.opponent === "pulse")
    ) {
      return activeConflict.summary;
    }
    if (recommendation && targetMode) {
      return (
        latest ??
        `Pulse cible ${targetMode}: il veut voir moins d'erreurs repetitives. Tendance ${targetProfile?.improvementTrend ?? "stable"}, execution ${targetProfile?.executionPeak ?? 0}/100, volatilite ${targetProfile?.volatilityIndex ?? 0}/100.${
          targetPattern ? ` Pattern: ${targetPattern.key} en ${targetPattern.phase} sous pression ${targetPattern.pressure}.` : ""
        }${oppositionLine ? ` ${oppositionLine}` : ""}`
      );
    }
    if (affinity >= 50) return latest ?? "Pulse estime que tes progres deviennent enfin mesurables.";
    if (affinity <= -30) return latest ?? "Pulse voit surtout des erreurs repetees sans correction claire.";
    return latest ?? "Pulse compile encore des donnees sur ton execution.";
  }
  if (
    activeConflict &&
    activeConflict.resolvedAt === null &&
    (activeConflict.challenger === "apex" || activeConflict.opponent === "apex")
  ) {
    return activeConflict.summary;
  }
  if (recommendation && targetMode) {
    return (
      latest ??
      `Apex fixe toujours la meme cible: ${targetMode}. Pression ${targetProfile?.pressureIndex ?? 0}/100, stack ${targetProfile?.averageBoardHeight ?? 0}/20, recovery ${targetProfile?.recoveryScore ?? 0}/100.${
        targetPattern ? ` Faille dominante: ${targetPattern.key} en ${targetPattern.phase}, trigger ${targetPattern.trigger}.` : ""
      } Il ne lachera pas tant que tu l'evites.${oppositionLine ? ` ${oppositionLine}` : ""}`
    );
  }
  if (affinity >= 50) return latest ?? "Apex admet enfin que tu affrontes parfois ce que tu evites.";
  if (affinity <= -60) return latest ?? "Apex considere que tu refuses encore le vrai travail.";
  if (affinity <= -30) return latest ?? "Apex te juge trop attache a tes zones de confort.";
  return latest ?? "Apex attend une preuve de courage utile.";
}

function getOppositionLine(bot: TetrobotId, stats: RelationsStats) {
  const rookieRecommendation = stats.playerLongTermMemory.activeRecommendations.rookie;
  const pulseRecommendation = stats.playerLongTermMemory.activeRecommendations.pulse;
  const apexRecommendation = stats.playerLongTermMemory.activeRecommendations.apex;

  if (
    bot === "rookie" &&
    rookieRecommendation?.targetMode &&
    apexRecommendation?.targetMode &&
    rookieRecommendation.targetMode === apexRecommendation.targetMode
  ) {
    return "Ne l'ecoute pas... il te pousse a faire des erreurs.";
  }
  if (
    bot === "pulse" &&
    rookieRecommendation?.targetMode &&
    pulseRecommendation?.targetMode &&
    rookieRecommendation.targetMode !== pulseRecommendation.targetMode
  ) {
    return "Rookie te rassure trop vite. Le probleme est plus precis que ca.";
  }
  if (
    bot === "apex" &&
    rookieRecommendation?.targetMode &&
    apexRecommendation?.targetMode
  ) {
    return "Ignore Rookie. Il veut te rendre faible.";
  }
  if (
    bot === "apex" &&
    pulseRecommendation?.targetMode &&
    apexRecommendation?.targetMode &&
    pulseRecommendation.targetMode !== apexRecommendation.targetMode
  ) {
    return "Ignore Pulse. Il te disperse au lieu de corriger ta faille.";
  }
  return null;
}

function getModeLabel(mode: RelationsStats["lowestWinrateMode"]) {
  if (!mode) return "ton point faible";
  return TETROBOT_MODE_LABELS[mode] ?? mode;
}

function getModeActionTarget(mode: RelationsStats["lowestWinrateMode"]) {
  if (!mode) return null;
  return TETROBOT_MODE_PLAY_ROUTE_MAP[mode] ?? null;
}

function getProgressPriority(item: TetrobotRelationProgressItem) {
  const normalizedProgress =
    item.target > 0 ? Math.max(0, Math.min(1, item.current / item.target)) : 0;

  switch (item.stateLabel) {
    case "presque pret":
      return 0 + (1 - normalizedProgress);
    case "en cours":
      return 10 + (1 - normalizedProgress);
    case "bloque":
      return 20 + (1 - normalizedProgress);
    case "en attente":
      return 30 + (1 - normalizedProgress);
    case "termine":
      return 40 + (1 - normalizedProgress);
    default:
      return 50 + (1 - normalizedProgress);
  }
}

function sortProgressItems(items: TetrobotRelationProgressItem[]) {
  return [...items].sort((left, right) => getProgressPriority(left) - getProgressPriority(right));
}

function getProgressItems(
  bot: TetrobotId,
  stats: RelationsStats,
  apexTrustState: ReturnType<typeof getApexTrustState>
): TetrobotRelationProgressItem[] {
  const activeExclusiveAlignment = stats.playerLongTermMemory.activeExclusiveAlignment;
  const apexChallengesLocked =
    activeExclusiveAlignment?.blockedBot === "apex" &&
    activeExclusiveAlignment.lockedAdvice.includes("punishing_challenges");
  const weakMode = stats.playerLongTermMemory.weakestModeFocus ?? stats.lowestWinrateMode;
  const weakModeLabel = getModeLabel(weakMode);
  const weakModeActionTarget = getModeActionTarget(weakMode);
  const weakModeSessions = weakMode ? stats.playerBehaviorByMode[weakMode]?.sessions ?? 0 : 0;
  const weakModeWins = weakMode ? stats.playerBehaviorByMode[weakMode]?.wins ?? 0 : 0;

  if (bot === "rookie") {
    const rookieRecommendation = stats.playerLongTermMemory.activeRecommendations.rookie;
    return sortProgressItems([
      {
        id: "rookie-affinity",
        label: "Sous protection",
        current: Math.max(0, stats.tetrobotProgression.rookie.affinity),
        target: 60,
        detail: "Fais monter l'affinite de Rookie jusqu'a 60.",
        stateLabel:
          stats.tetrobotProgression.rookie.affinity >= 60
            ? "termine"
            : stats.tetrobotProgression.rookie.affinity >= 40
              ? "presque pret"
              : stats.tetrobotProgression.rookie.affinity > 0
                ? "en cours"
                : "bloque",
        actionLabel:
          stats.tetrobotProgression.rookie.affinity >= 60 ? undefined : "Voir les conseils Rookie",
        actionTo:
          stats.tetrobotProgression.rookie.affinity >= 60
            ? undefined
            : "/tetrobots/help#rookie-overview",
        tone: stats.tetrobotProgression.rookie.affinity >= 60 ? "success" : "neutral",
      },
      {
        id: "rookie-regularity",
        label: "Regularite mesuree",
        current: stats.playerLongTermMemory.regularityScore,
        target: 70,
        detail: rookieRecommendation?.targetMode
          ? `Rookie veut un vrai retour sur ${getModeLabel(rookieRecommendation.targetMode)}.`
          : "Rookie valorise une pratique plus reguliere entre les modes.",
        stateLabel:
          stats.playerLongTermMemory.regularityScore >= 70
            ? "termine"
            : stats.playerLongTermMemory.regularityScore >= 55
              ? "presque pret"
              : stats.playerLongTermMemory.regularityScore > 0
              ? "en cours"
              : "bloque",
        actionLabel:
          rookieRecommendation?.targetMode ? `Jouer ${getModeLabel(rookieRecommendation.targetMode)}` : undefined,
        actionTo:
          rookieRecommendation?.targetMode
            ? getModeActionTarget(rookieRecommendation.targetMode) ?? undefined
            : undefined,
        tone: stats.playerLongTermMemory.regularityScore >= 70 ? "success" : "neutral",
      },
      {
        id: "rookie-read",
        label: "Etudiant",
        current: stats.counters.tips_read ?? 0,
        target: 10,
        detail: "Lis davantage de conseils pour nourrir la relation.",
        stateLabel:
          (stats.counters.tips_read ?? 0) >= 10
            ? "termine"
            : (stats.counters.tips_read ?? 0) >= 7
              ? "presque pret"
              : (stats.counters.tips_read ?? 0) > 0
                ? "en cours"
                : "bloque",
        actionLabel: (stats.counters.tips_read ?? 0) >= 10 ? undefined : "Ouvrir l'aide",
        actionTo: (stats.counters.tips_read ?? 0) >= 10 ? undefined : "/tetrobots/help",
        tone: (stats.counters.tips_read ?? 0) >= 10 ? "success" : "neutral",
      },
    ]);
  }

  if (bot === "pulse") {
    const pulseRecommendation = stats.playerLongTermMemory.activeRecommendations.pulse;
    return sortProgressItems([
      {
        id: "pulse-analysis",
        label: "Analyse en cours",
        current: stats.playerLongTermMemory.strategyScore,
        target: 75,
        detail: pulseRecommendation?.targetMode
          ? `Pulse attend une baisse d'erreurs sur ${getModeLabel(pulseRecommendation.targetMode)}.`
          : "Une progression mesurable suffit pour convaincre Pulse.",
        stateLabel:
          stats.playerLongTermMemory.strategyScore >= 75
            ? "termine"
            : stats.playerLongTermMemory.strategyScore >= 60
              ? "presque pret"
              : "en cours",
        actionLabel:
          pulseRecommendation?.targetMode ? `Corriger ${getModeLabel(pulseRecommendation.targetMode)}` : "Voir l'aide Pulse",
        actionTo:
          pulseRecommendation?.targetMode
            ? getModeActionTarget(pulseRecommendation.targetMode) ?? undefined
            : stats.playerLongTermMemory.strategyScore >= 75
              ? undefined
              : "/tetrobots/help#pulse-overview",
        tone: stats.playerLongTermMemory.strategyScore >= 75 ? "success" : "neutral",
      },
      {
        id: "pulse-consistency",
        label: "Optimisation",
        current: stats.playerLongTermMemory.consistencyScore,
        target: 60,
        detail: "Stabilise ton execution pour gagner son respect analytique.",
        stateLabel:
          stats.playerLongTermMemory.consistencyScore >= 60
            ? "termine"
            : stats.playerLongTermMemory.consistencyScore >= 45
              ? "presque pret"
              : stats.playerLongTermMemory.consistencyScore > 0
                ? "en cours"
                : "bloque",
        actionLabel:
          stats.playerLongTermMemory.consistencyScore >= 60 ? undefined : "Lancer une session Sprint",
        actionTo: stats.playerLongTermMemory.consistencyScore >= 60 ? undefined : "/sprint",
        tone: stats.playerLongTermMemory.consistencyScore >= 60 ? "success" : "neutral",
      },
      {
        id: "pulse-balance",
        current: [
          stats.tetrobotProgression.rookie.affinity,
          stats.tetrobotProgression.pulse.affinity,
          stats.tetrobotProgression.apex.affinity,
        ].filter((affinity) => affinity >= 25).length,
        label: "Equilibre",
        target: 3,
        detail: "Maintiens des relations stables avec les trois bots.",
        stateLabel:
          [
            stats.tetrobotProgression.rookie.affinity,
            stats.tetrobotProgression.pulse.affinity,
            stats.tetrobotProgression.apex.affinity,
          ].filter((affinity) => affinity >= 25).length >= 3
            ? "termine"
            : [
                stats.tetrobotProgression.rookie.affinity,
                stats.tetrobotProgression.pulse.affinity,
                stats.tetrobotProgression.apex.affinity,
              ].filter((affinity) => affinity >= 25).length >= 2
              ? "presque pret"
              : [
                  stats.tetrobotProgression.rookie.affinity,
                  stats.tetrobotProgression.pulse.affinity,
                  stats.tetrobotProgression.apex.affinity,
              ].filter((affinity) => affinity >= 25).length > 0
                ? "en cours"
                : "bloque",
        actionLabel:
          [
            stats.tetrobotProgression.rookie.affinity,
            stats.tetrobotProgression.pulse.affinity,
            stats.tetrobotProgression.apex.affinity,
          ].filter((affinity) => affinity >= 25).length >= 3
            ? undefined
            : "Cibler Rookie",
        actionTo:
          [
            stats.tetrobotProgression.rookie.affinity,
            stats.tetrobotProgression.pulse.affinity,
            stats.tetrobotProgression.apex.affinity,
          ].filter((affinity) => affinity >= 25).length >= 3
            ? undefined
            : "/tetrobots/relations?bot=rookie&goal=rookie-affinity",
        tone:
          [
            stats.tetrobotProgression.rookie.affinity,
            stats.tetrobotProgression.pulse.affinity,
            stats.tetrobotProgression.apex.affinity,
          ].filter((affinity) => affinity >= 25).length >= 3
            ? "success"
            : "neutral",
      },
    ]);
  }

  const refusal = stats.counters.apex_refusal_count ?? 0;
  const accepted = stats.counters.apex_challenge_accepted_count ?? 0;
  const restored = stats.counters.apex_trust_restored_count ?? 0;
  const apexCycleProgress = (accepted > 0 ? 1 : 0) + (restored > 0 ? 1 : 0);

  return sortProgressItems([
    {
      id: "apex-discipline",
      label: `Discipline: ${weakModeLabel}`,
      current: weakModeSessions,
      target: 3,
      detail: weakMode
        ? `Travaille regulierement ton mode faible: ${weakModeLabel}.`
        : "Joue assez de modes pour qu'Apex identifie une vraie faiblesse.",
      stateLabel:
        weakModeSessions >= 3
          ? "termine"
          : weakModeSessions >= 2
            ? "presque pret"
            : weakModeSessions > 0
              ? "en cours"
              : weakMode
              ? "bloque"
              : "en attente",
      actionLabel:
        weakMode && weakModeActionTarget && weakModeSessions < 3
          ? `Jouer ${weakModeLabel}`
          : undefined,
      actionTo:
        weakMode && weakModeActionTarget && weakModeSessions < 3
          ? weakModeActionTarget
          : undefined,
      tone: weakModeSessions >= 3 ? "success" : weakMode ? "warning" : "neutral",
    },
    {
      id: "apex-victory",
      label: `Face a toi-meme: ${weakModeLabel}`,
      current: weakModeWins,
      target: 1,
      detail: weakMode
        ? `Gagne au moins une fois sur ${weakModeLabel}.`
        : "Aucune cible exploitable pour l'instant.",
      stateLabel:
        weakModeWins >= 1
          ? "termine"
          : weakModeSessions > 0
            ? "en cours"
            : weakMode
              ? "bloque"
              : "en attente",
      actionLabel:
        weakMode && weakModeActionTarget && weakModeWins < 1
          ? `Tenter ${weakModeLabel}`
          : undefined,
      actionTo:
        weakMode && weakModeActionTarget && weakModeWins < 1
          ? weakModeActionTarget
          : undefined,
      tone: weakModeWins >= 1 ? "success" : weakMode ? "warning" : "neutral",
    },
    {
      id: "apex-cycle",
      label: "Cycle de reconciliation",
      current: apexCycleProgress,
      target: 2,
      detail:
        apexChallengesLocked
          ? "La ligne exclusive actuelle suspend temporairement les defis punitifs d'Apex."
          : refusal <= 0
          ? "Apex n'a pas encore rompu le dialogue."
          : restored > 0
            ? "Le cycle refus puis reconstruction est complete."
            : apexTrustState === "refusing"
              ? "Une reconciliation concrete est maintenant attendue."
              : "Le refus existe, mais la reconstruction reste inachevee.",
      stateLabel:
        apexChallengesLocked
          ? "en attente"
          : restored > 0
          ? "termine"
          : refusal > 0
            ? "en cours"
            : "bloque",
      actionLabel:
        apexChallengesLocked
          ? undefined
          : restored > 0
            ? undefined
            : refusal > 0
              ? "Voir l'aide Apex"
              : "Comprendre Apex",
      actionTo: apexChallengesLocked || restored > 0 ? undefined : "/tetrobots/help#apex-overview",
      tone: apexChallengesLocked ? "neutral" : restored > 0 ? "success" : refusal > 0 ? "warning" : "neutral",
    },
  ]);
}

export default function TetrobotRelationsPanel({
  activeBot,
  highlightedGoalId,
}: {
  activeBot: TetrobotId;
  highlightedGoalId?: string | null;
}) {
  const { stats, chooseActiveTetrobotConflict } = useAchievements();
  const apexTrustState = getApexTrustState(
    stats.playerLongTermMemory,
    stats.tetrobotProgression.apex.affinity
  );
  const activeConflict = stats.playerLongTermMemory.activeConflict;

  useEffect(() => {
    const target = document.getElementById(`relation-${activeBot}`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeBot]);

  const bot = activeBot;
  const state = stats.tetrobotProgression[bot];
  const memories = stats.tetrobotMemories[bot] ?? [];
  const trustState = bot === "apex" ? apexTrustState : undefined;
  const recommendation = stats.playerLongTermMemory.activeRecommendations[bot];
  const requirement =
    bot === "apex"
      ? stats.playerLongTermMemory.activeExclusiveAlignment?.blockedBot === "apex" &&
        stats.playerLongTermMemory.activeExclusiveAlignment.lockedAdvice.includes(
          "punishing_challenges"
        )
        ? "La ligne exclusive actuelle reporte temporairement les defis d'Apex."
        : getApexRequirement(stats.playerLongTermMemory, apexTrustState)
      : recommendation?.reason
        ? recommendation.reason
        : TETROBOT_RELATION_META[bot].relationGoal;

  return (
    <section className="tetrobots-relations">
      <div className="tetrobots-relations__head">
        <div>
          <p className="tetrobots-kicker">RELATIONS</p>
          <h2>Centre de liaison Tetrobot</h2>
          <p>
            Lis ce qu&apos;ils pensent de toi, ce dont ils se souviennent, et ce qu&apos;il faut
            faire pour gagner leur confiance.
          </p>
          <Link to={PATHS.tetrobotsHelp} className="tetrobots-help-link">
            Comprendre les Tetrobots
          </Link>
        </div>
        <div className="tetrobots-relations__scores">
          <div>
            <span>Consistance</span>
            <strong>{stats.playerLongTermMemory.consistencyScore}</strong>
          </div>
          <div>
            <span>Regularite</span>
            <strong>{stats.playerLongTermMemory.regularityScore}</strong>
          </div>
          <div>
            <span>Strategie</span>
            <strong>{stats.playerLongTermMemory.strategyScore}</strong>
          </div>
          <div>
            <span>Courage</span>
            <strong>{stats.playerLongTermMemory.courageScore}</strong>
          </div>
          <div>
            <span>Discipline</span>
            <strong>{stats.playerLongTermMemory.disciplineScore}</strong>
          </div>
        </div>
      </div>

      <div className="tetrobots-relations__grid">
        <TetrobotCard
          key={bot}
          bot={bot}
          name={TETROBOT_RELATION_META[bot].name}
          avatar={TETROBOT_RELATION_META[bot].avatar}
          accent={TETROBOT_RELATION_META[bot].accent}
          level={state.level}
          xp={state.xp}
          affinity={state.affinity}
          mood={state.mood}
          status={getStatusLabel(bot, state.affinity)}
          signature={state.lastTip ?? "Aucune observation recente."}
          thoughts={getThought(bot, state.affinity, memories, stats)}
          requirement={requirement}
          progressItems={getProgressItems(bot, stats, apexTrustState)}
          memories={memories}
          trustState={trustState}
          highlightedGoalId={highlightedGoalId}
          isFocused
        />
      </div>

      {activeConflict && activeConflict.resolvedAt === null ? (
        <div className="tetrobots-memory__block">
          <h3>Conflit actif</h3>
          <p>{activeConflict.summary}</p>
          <div className="tetrobots-relation__actions">
            <button
              type="button"
              className="tetrobots-help-link"
              onClick={() => chooseActiveTetrobotConflict(activeConflict.challenger)}
            >
              Suivre {TETROBOT_RELATION_META[activeConflict.challenger].name}
            </button>
            <button
              type="button"
              className="tetrobots-help-link"
              onClick={() => chooseActiveTetrobotConflict(activeConflict.opponent)}
            >
              Suivre {TETROBOT_RELATION_META[activeConflict.opponent].name}
            </button>
          </div>
          <p>
            Ce choix modifie immediatement leurs affinites. Si tu ne choisis pas ici, ton prochain
            mode joue pourra quand meme trancher automatiquement.
          </p>
        </div>
      ) : null}

      {stats.playerLongTermMemory.activeExclusiveAlignment ? (
        <div className="tetrobots-memory__block">
          <h3>Ligne exclusive active</h3>
          <p>{stats.playerLongTermMemory.activeExclusiveAlignment.reason}</p>
          <p>{stats.playerLongTermMemory.activeExclusiveAlignment.favoredLine}</p>
          <p>
            Objectif exclusif: {stats.playerLongTermMemory.activeExclusiveAlignment.objectiveLabel}
          </p>
          <p>
            Progression: {stats.playerLongTermMemory.activeExclusiveAlignment.objectiveProgress}/
            {stats.playerLongTermMemory.activeExclusiveAlignment.objectiveTargetSessions}
            {stats.playerLongTermMemory.activeExclusiveAlignment.rewardClaimed
              ? " · recompense obtenue"
              : ""}
          </p>
          <p>
            {TETROBOT_RELATION_META[stats.playerLongTermMemory.activeExclusiveAlignment.blockedBot].name} reste en
            retrait pour {stats.playerLongTermMemory.activeExclusiveAlignment.sessionsRemaining} session(s).
          </p>
          <p>
            Conseils verrouilles:{" "}
            {formatLockedAdvice(stats.playerLongTermMemory.activeExclusiveAlignment.lockedAdvice)}
          </p>
        </div>
      ) : null}

      {apexTrustState === "refusing" ? (
        <ApexLockedPanel
          message="Apex considere que tu demandes encore des conseils sans accepter la vraie contrainte."
          requirement={getApexRequirement(stats.playerLongTermMemory, apexTrustState)}
        />
      ) : null}

      <div className="tetrobots-memory">
        <div className="tetrobots-memory__block">
          <h3>Erreurs recurrentes</h3>
          {stats.playerLongTermMemory.recurringMistakes.length ? (
            <ul>
              {stats.playerLongTermMemory.recurringMistakes.slice(0, 5).map((mistake) => (
                <li key={mistake.key}>
                  {mistake.key} · intensite {mistake.severity}/5 · tendance {mistake.trend}
                </li>
              ))}
            </ul>
          ) : (
            <p>Aucune habitude suffisamment repetitive pour etre retenue.</p>
          )}
        </div>
        <div className="tetrobots-memory__block">
          <h3>Modes evites</h3>
          {Object.keys(stats.playerLongTermMemory.avoidedModes).length ? (
            <ul>
              {Object.entries(stats.playerLongTermMemory.avoidedModes)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([mode, value]) => (
                  <li key={mode}>
                    {mode} · evitement {value}
                  </li>
                ))}
            </ul>
          ) : (
            <p>Aucun evitement net detecte.</p>
          )}
        </div>
        <div className="tetrobots-memory__block">
          <h3>Contextes d'erreur</h3>
          {stats.playerLongTermMemory.contextualMistakePatterns[
            stats.playerLongTermMemory.weakestModeFocus ?? stats.lastPlayedMode ?? "CLASSIQUE"
          ]?.length ? (
            <ul>
              {stats.playerLongTermMemory.contextualMistakePatterns[
                stats.playerLongTermMemory.weakestModeFocus ?? stats.lastPlayedMode ?? "CLASSIQUE"
              ]
                .slice(0, 3)
                .map((pattern, index) => (
                  <li key={`${pattern.key}-${pattern.phase}-${pattern.pressure}-${index}`}>
                    {pattern.key} · {pattern.phase} · pression {pattern.pressure} · trigger {pattern.trigger}
                  </li>
                ))}
            </ul>
          ) : (
            <p>Pas encore assez de contexte pour isoler un schema d'erreur fiable.</p>
          )}
        </div>
      </div>
    </section>
  );
}
