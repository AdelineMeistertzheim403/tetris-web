import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  type BotMemoryEntry,
  type TetrobotId,
  getApexTrustState,
  useAchievements,
} from "../../achievements/hooks/useAchievements";
import { getApexRequirement } from "../logic/apexTrustEngine";
import ApexLockedPanel from "./ApexLockedPanel";
import TetrobotCard from "./TetrobotCard";

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

export default function TetrobotRelationsPanel({
  focusedBot,
}: {
  focusedBot?: TetrobotId | null;
}) {
  const { stats } = useAchievements();
  const apexTrustState = getApexTrustState(
    stats.playerLongTermMemory,
    stats.tetrobotProgression.apex.affinity
  );

  useEffect(() => {
    if (!focusedBot) return;
    const target = document.getElementById(`relation-${focusedBot}`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusedBot]);

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
        {(["rookie", "pulse", "apex"] as const).map((bot) => {
          const state = stats.tetrobotProgression[bot];
          const memories = stats.tetrobotMemories[bot] ?? [];
          const trustState = bot === "apex" ? apexTrustState : undefined;
          const requirement =
            bot === "apex"
              ? getApexRequirement(stats.playerLongTermMemory, apexTrustState)
              : BOT_META[bot].relationGoal;

          return (
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
              memories={memories}
              trustState={trustState}
              isFocused={focusedBot === bot}
            />
          );
        })}
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
