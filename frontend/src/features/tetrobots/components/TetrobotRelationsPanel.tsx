import { useEffect } from "react";
import { Link } from "react-router-dom";
import type { BotMemoryEntry, TetrobotId } from "../../achievements/types/tetrobots";
import { getApexTrustState } from "../../achievements/lib/tetrobotAchievementLogic";
import {
  useAchievements,
} from "../../achievements/hooks/useAchievements";
import { getApexRequirement } from "../logic/apexTrustEngine";
import ApexLockedPanel from "./ApexLockedPanel";
import TetrobotCard, { type TetrobotRelationProgressItem } from "./TetrobotCard";

const BOT_META: Record<TetrobotId, { name: string; accent: string; relationGoal: string }> = {
  rookie: {
    name: "Rookie",
    accent: "#5de0a4",
    relationGoal: "Rookie aime la regularite, les retours apres echec et les sessions utiles.",
  },
  pulse: {
    name: "Pulse",
    accent: "#65b7ff",
    relationGoal: "Pulse respecte les progres mesurables et les corrections methodiques.",
  },
  apex: {
    name: "Apex",
    accent: "#ff7f66",
    relationGoal: "Apex ne respecte que le courage, la discipline et le travail sur les vraies faiblesses.",
  },
};

const AVATARS: Record<TetrobotId, string> = {
  rookie: "/chatbots/rookie_neutral.png",
  pulse: "/chatbots/pulse_neutral.png",
  apex: "/chatbots/apex_neutral.png",
};

type RelationsStats = ReturnType<typeof useAchievements>["stats"];

const MODE_LABELS: Partial<Record<NonNullable<RelationsStats["lowestWinrateMode"]>, string>> = {
  CLASSIQUE: "Classique",
  SPRINT: "Sprint",
  VERSUS: "Versus",
  BRICKFALL_SOLO: "Brickfall Solo",
  ROGUELIKE: "Roguelike",
  ROGUELIKE_VERSUS: "Roguelike Versus",
  PUZZLE: "Puzzle",
  TETROMAZE: "Tetromaze",
  PIXEL_INVASION: "Pixel Invasion",
  PIXEL_PROTOCOL: "Pixel Protocol",
};

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

function getThought(bot: TetrobotId, affinity: number, memories: BotMemoryEntry[]) {
  const latest = memories[0]?.text;
  if (bot === "rookie") {
    if (affinity >= 50) return latest ?? "Tu reviens apres tes echecs. Rookie y voit de la vraie perseverance.";
    if (affinity <= -30) return latest ?? "Rookie pense que tu abandonnes trop vite quand la pression monte.";
    return latest ?? "Rookie observe encore ta maniere d'apprendre.";
  }
  if (bot === "pulse") {
    if (affinity >= 50) return latest ?? "Pulse estime que tes progres deviennent enfin mesurables.";
    if (affinity <= -30) return latest ?? "Pulse voit surtout des erreurs repetees sans correction claire.";
    return latest ?? "Pulse compile encore des donnees sur ton execution.";
  }
  if (affinity >= 50) return latest ?? "Apex admet enfin que tu affrontes parfois ce que tu evites.";
  if (affinity <= -60) return latest ?? "Apex considere que tu refuses encore le vrai travail.";
  if (affinity <= -30) return latest ?? "Apex te juge trop attache a tes zones de confort.";
  return latest ?? "Apex attend une preuve de courage utile.";
}

function getModeLabel(mode: RelationsStats["lowestWinrateMode"]) {
  if (!mode) return "ton point faible";
  return MODE_LABELS[mode] ?? mode;
}

function getModeActionTarget(mode: RelationsStats["lowestWinrateMode"]) {
  switch (mode) {
    case "CLASSIQUE":
      return "/game";
    case "SPRINT":
      return "/sprint";
    case "VERSUS":
      return "/versus";
    case "BRICKFALL_SOLO":
      return "/brickfall-solo/play";
    case "ROGUELIKE":
      return "/roguelike";
    case "ROGUELIKE_VERSUS":
      return "/roguelike-versus";
    case "PUZZLE":
      return "/puzzle";
    case "TETROMAZE":
      return "/tetromaze/play";
    case "PIXEL_INVASION":
      return "/pixel-invasion";
    case "PIXEL_PROTOCOL":
      return "/pixel-protocol/play";
    default:
      return null;
  }
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
  const weakMode = stats.lowestWinrateMode;
  const weakModeLabel = getModeLabel(weakMode);
  const weakModeActionTarget = getModeActionTarget(weakMode);
  const weakModeSessions = weakMode ? stats.playerBehaviorByMode[weakMode]?.sessions ?? 0 : 0;
  const weakModeWins = weakMode ? stats.playerBehaviorByMode[weakMode]?.wins ?? 0 : 0;

  if (bot === "rookie") {
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
        id: "rookie-tips",
        label: "Je t'ecoute",
        current: stats.counters.rookie_tips_followed ?? 0,
        target: 3,
        detail: "Suis ses conseils utiles sur plusieurs sessions propres.",
        stateLabel:
          (stats.counters.rookie_tips_followed ?? 0) >= 3
            ? "termine"
            : (stats.counters.rookie_tips_followed ?? 0) >= 2
              ? "presque pret"
              : (stats.counters.rookie_tips_followed ?? 0) > 0
              ? "en cours"
              : "bloque",
        actionLabel:
          (stats.counters.rookie_tips_followed ?? 0) >= 3 ? undefined : "Relire l'aide Rookie",
        actionTo:
          (stats.counters.rookie_tips_followed ?? 0) >= 3
            ? undefined
            : "/tetrobots/help#rookie-relationship",
        tone: (stats.counters.rookie_tips_followed ?? 0) >= 3 ? "success" : "neutral",
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
    return sortProgressItems([
      {
        id: "pulse-analysis",
        label: "Analyse en cours",
        current: stats.counters.pulse_advice_success ?? 0,
        target: 1,
        detail: "Une progression mesurable suffit pour convaincre Pulse.",
        stateLabel: (stats.counters.pulse_advice_success ?? 0) >= 1 ? "termine" : "en cours",
        actionLabel:
          (stats.counters.pulse_advice_success ?? 0) >= 1 ? undefined : "Voir l'aide Pulse",
        actionTo:
          (stats.counters.pulse_advice_success ?? 0) >= 1
            ? undefined
            : "/tetrobots/help#pulse-overview",
        tone: (stats.counters.pulse_advice_success ?? 0) >= 1 ? "success" : "neutral",
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
        refusal <= 0
          ? "Apex n'a pas encore rompu le dialogue."
          : restored > 0
            ? "Le cycle refus puis reconstruction est complete."
            : apexTrustState === "refusing"
              ? "Une reconciliation concrete est maintenant attendue."
              : "Le refus existe, mais la reconstruction reste inachevee.",
      stateLabel:
        restored > 0
          ? "termine"
          : refusal > 0
            ? "en cours"
            : "bloque",
      actionLabel:
        restored > 0 ? undefined : refusal > 0 ? "Voir l'aide Apex" : "Comprendre Apex",
      actionTo: restored > 0 ? undefined : "/tetrobots/help#apex-overview",
      tone: restored > 0 ? "success" : refusal > 0 ? "warning" : "neutral",
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
  const { stats } = useAchievements();
  const apexTrustState = getApexTrustState(
    stats.playerLongTermMemory,
    stats.tetrobotProgression.apex.affinity
  );

  useEffect(() => {
    const target = document.getElementById(`relation-${activeBot}`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeBot]);

  const bot = activeBot;
  const state = stats.tetrobotProgression[bot];
  const memories = stats.tetrobotMemories[bot] ?? [];
  const trustState = bot === "apex" ? apexTrustState : undefined;
  const requirement =
    bot === "apex"
      ? getApexRequirement(stats.playerLongTermMemory, apexTrustState)
      : BOT_META[bot].relationGoal;

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
          <Link to="/tetrobots/help" className="tetrobots-help-link">
            Comprendre les Tetrobots
          </Link>
        </div>
        <div className="tetrobots-relations__scores">
          <div>
            <span>Consistance</span>
            <strong>{stats.playerLongTermMemory.consistencyScore}</strong>
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
          name={BOT_META[bot].name}
          avatar={AVATARS[bot]}
          accent={BOT_META[bot].accent}
          level={state.level}
          xp={state.xp}
          affinity={state.affinity}
          mood={state.mood}
          status={getStatusLabel(bot, state.affinity)}
          signature={state.lastTip ?? "Aucune observation recente."}
          thoughts={getThought(bot, state.affinity, memories)}
          requirement={requirement}
          progressItems={getProgressItems(bot, stats, apexTrustState)}
          memories={memories}
          trustState={trustState}
          highlightedGoalId={highlightedGoalId}
          isFocused
        />
      </div>

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
      </div>
    </section>
  );
}
