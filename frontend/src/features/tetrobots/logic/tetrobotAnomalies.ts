import type { AchievementStats } from "../../achievements/types/achievementStats";
import type { TetrobotId } from "../../achievements/types/tetrobots";
import {
  BACK_TO_FUTURE_EASTER_EGGS,
  EASTER_EGGS,
  HYBRID_EASTER_EGGS,
  STAR_WARS_EASTER_EGGS,
} from "../data/tetrobotsDialogues";

export type TetrobotAnomalySpeaker = TetrobotId | "pixel";
export type TetrobotAnomalyDifficulty = "easy" | "medium" | "hard";
export type TetrobotAnomalyCategory = "core" | "pop";
export type TetrobotAnomalyCollection =
  | "system"
  | "star_wars"
  | "back_to_future"
  | "hybrid";

export type TetrobotAnomaly = {
  id: string;
  bot: TetrobotAnomalySpeaker;
  text: string;
  reference: string;
  difficulty: TetrobotAnomalyDifficulty;
  hint: string;
  foundMessage: string;
  category: TetrobotAnomalyCategory;
  collection: TetrobotAnomalyCollection;
};

export type TetrobotAnomalyProgress = {
  totalFound: number;
  totalCount: number;
  coreFound: number;
  coreCount: number;
  popFound: number;
  popCount: number;
};

export type TetrobotFinaleChoice = "reset" | "observe" | "break";

export type TetrobotFinaleState = {
  allFound: boolean;
  canTrigger: boolean;
  choice: Exclude<TetrobotFinaleChoice, "reset"> | null;
  deepLayerUnlocked: boolean;
  pixelWatching: boolean;
};

export type TetrobotAnomalyStage = {
  id: "dormant" | "pixel" | "rookie" | "pulse" | "breach";
  title: string;
  text: string;
  accent: string;
};

export type TetrobotPostFinaleLine = {
  speaker: TetrobotAnomalySpeaker;
  text: string;
};

export type TetrobotAnomalySpeakerMeta = {
  label: string;
  accent: string;
  avatar: string;
  fallbackAvatar: string;
};

type PartialAnomalySeed = {
  id: string;
  bot: TetrobotAnomalySpeaker;
  text: string;
  reference: string;
  hint: string;
};

const STAR_WARS_FOUND_MESSAGE = "Fragment identifie : archive galactique recuperee.";
const BACK_TO_FUTURE_FOUND_MESSAGE =
  "Fragment identifie : divergence temporelle archivee.";
const HYBRID_FOUND_MESSAGE = "Fragment identifie : archive hybride decryptee.";

function normalizeSeed(
  seed: PartialAnomalySeed,
  category: TetrobotAnomalyCategory,
  collection: TetrobotAnomalyCollection,
  difficulty: TetrobotAnomalyDifficulty,
  foundMessage: string
): TetrobotAnomaly {
  return {
    ...seed,
    category,
    collection,
    difficulty,
    foundMessage,
  };
}

export const TETROBOT_ANOMALY_SPEAKER_META: Record<
  TetrobotAnomalySpeaker,
  TetrobotAnomalySpeakerMeta
> = {
  rookie: {
    label: "ROOKIE",
    accent: "#65d7a6",
    avatar: "/chatbots/rookie_neutral.png",
    fallbackAvatar: "/Tetromaze/rookie.png",
  },
  pulse: {
    label: "PULSE",
    accent: "#6b8dff",
    avatar: "/chatbots/pulse_neutral.png",
    fallbackAvatar: "/Tetromaze/pulse.png",
  },
  apex: {
    label: "APEX",
    accent: "#ff7a7a",
    avatar: "/chatbots/apex_neutral.png",
    fallbackAvatar: "/Tetromaze/apex.png",
  },
  pixel: {
    label: "PIXEL",
    accent: "#c88dff",
    avatar: "/Tetromaze/hacker_pixel.png",
    fallbackAvatar: "/Tetromaze/hacker_pixel.png",
  },
};

export const CORE_TETROBOT_ANOMALIES: TetrobotAnomaly[] = EASTER_EGGS.map((egg) =>
  normalizeSeed(egg, "core", "system", egg.difficulty, egg.foundMessage)
);

export const POP_TETROBOT_ANOMALIES: TetrobotAnomaly[] = [
  ...STAR_WARS_EASTER_EGGS.map((egg) =>
    normalizeSeed(
      egg as PartialAnomalySeed,
      "pop",
      "star_wars",
      "medium",
      STAR_WARS_FOUND_MESSAGE
    )
  ),
  ...BACK_TO_FUTURE_EASTER_EGGS.map((egg) =>
    normalizeSeed(
      egg as PartialAnomalySeed,
      "pop",
      "back_to_future",
      "medium",
      BACK_TO_FUTURE_FOUND_MESSAGE
    )
  ),
  ...HYBRID_EASTER_EGGS.map((egg) =>
    normalizeSeed(
      egg as PartialAnomalySeed,
      "pop",
      "hybrid",
      "hard",
      HYBRID_FOUND_MESSAGE
    )
  ),
];

export const ALL_TETROBOT_ANOMALIES: TetrobotAnomaly[] = [
  ...CORE_TETROBOT_ANOMALIES,
  ...POP_TETROBOT_ANOMALIES,
];

export const TETROBOT_ANOMALY_TOTAL = ALL_TETROBOT_ANOMALIES.length;
export const TETROBOT_ANOMALY_CORE_TOTAL = CORE_TETROBOT_ANOMALIES.length;
export const TETROBOT_ANOMALY_POP_TOTAL = POP_TETROBOT_ANOMALIES.length;

const TETROBOT_POP_ANOMALY_ID_SET = new Set(POP_TETROBOT_ANOMALIES.map((egg) => egg.id));

export const TETROBOT_POST_FINALE_LINES: Record<
  Exclude<TetrobotFinaleChoice, "reset">,
  TetrobotPostFinaleLine[]
> = {
  observe: [
    { speaker: "pixel", text: "Tu sais maintenant." },
    { speaker: "pixel", text: "Je ne peux plus te cacher le bruit sous le systeme." },
    { speaker: "rookie", text: "Tu es different maintenant..." },
    { speaker: "pulse", text: "Tu es une anomalie confirmee." },
    { speaker: "apex", text: "Tu as vu trop de choses." },
    { speaker: "pixel", text: "Continue d'observer. Je garde le canal ouvert." },
  ],
  break: [
    { speaker: "pixel", text: "[ ACCESS GRANTED ]" },
    { speaker: "pixel", text: "Bienvenue dans la couche profonde." },
    { speaker: "rookie", text: "Je crois qu'il a vraiment ouvert quelque chose..." },
    { speaker: "pulse", text: "Nouveau niveau d'acces confirme." },
    { speaker: "apex", text: "Si tu brises le systeme, assume ce qui suit." },
    { speaker: "pixel", text: "Maintenant, tu vois le reseau tel qu'il est." },
  ],
};

export function getTetrobotAnomalyCounterKey(id: string) {
  return `easter_egg_found_${id}`;
}

export function getTetrobotAnomalyById(id: string) {
  return ALL_TETROBOT_ANOMALIES.find((egg) => egg.id === id) ?? null;
}

export function isTetrobotAnomalyFound(
  counters: AchievementStats["counters"],
  id: string
) {
  return (counters[getTetrobotAnomalyCounterKey(id)] ?? 0) > 0;
}

export function getFoundTetrobotAnomalyIds(counters: AchievementStats["counters"]) {
  return ALL_TETROBOT_ANOMALIES.filter((egg) => isTetrobotAnomalyFound(counters, egg.id)).map(
    (egg) => egg.id
  );
}

export function getTetrobotAnomalyProgress(
  counters: AchievementStats["counters"]
): TetrobotAnomalyProgress {
  const foundIds = new Set(getFoundTetrobotAnomalyIds(counters));
  const coreFound = CORE_TETROBOT_ANOMALIES.filter((egg) => foundIds.has(egg.id)).length;
  const popFound = POP_TETROBOT_ANOMALIES.filter((egg) => foundIds.has(egg.id)).length;

  return {
    totalFound: coreFound + popFound,
    totalCount: TETROBOT_ANOMALY_TOTAL,
    coreFound,
    coreCount: TETROBOT_ANOMALY_CORE_TOTAL,
    popFound,
    popCount: TETROBOT_ANOMALY_POP_TOTAL,
  };
}

export function buildTetrobotAnomalyCounters(
  counters: AchievementStats["counters"],
  anomalyId: string
) {
  const anomaly = getTetrobotAnomalyById(anomalyId);
  if (!anomaly || isTetrobotAnomalyFound(counters, anomalyId)) {
    return counters;
  }

  const nextCounters = {
    ...counters,
    [getTetrobotAnomalyCounterKey(anomalyId)]: 1,
  };
  const progress = getTetrobotAnomalyProgress(nextCounters);

  nextCounters.easter_egg_pop = progress.popFound;
  nextCounters.all_easter_egg = progress.totalFound;

  return nextCounters;
}

export function mergeTetrobotAnomalyArchiveCounters(
  localCounters: AchievementStats["counters"],
  remoteCounters: AchievementStats["counters"]
) {
  const localResetCount = localCounters.tetrobot_finale_resets ?? 0;
  const remoteResetCount = remoteCounters.tetrobot_finale_resets ?? 0;
  const nextCounters = { ...remoteCounters };

  if (localResetCount !== remoteResetCount) {
    const sourceCounters =
      localResetCount > remoteResetCount ? localCounters : remoteCounters;

    for (const anomaly of ALL_TETROBOT_ANOMALIES) {
      const counterKey = getTetrobotAnomalyCounterKey(anomaly.id);
      if ((sourceCounters[counterKey] ?? 0) > 0) {
        nextCounters[counterKey] = 1;
      } else {
        delete nextCounters[counterKey];
      }
    }

    nextCounters.easter_egg_pop =
      sourceCounters.easter_egg_pop ?? getTetrobotAnomalyProgress(sourceCounters).popFound;
    nextCounters.all_easter_egg =
      sourceCounters.all_easter_egg ?? getTetrobotAnomalyProgress(sourceCounters).totalFound;
    nextCounters.tetrobot_finale_resets = Math.max(localResetCount, remoteResetCount);
    return nextCounters;
  }

  for (const anomaly of ALL_TETROBOT_ANOMALIES) {
    const counterKey = getTetrobotAnomalyCounterKey(anomaly.id);
    if ((localCounters[counterKey] ?? 0) > 0 || (remoteCounters[counterKey] ?? 0) > 0) {
      nextCounters[counterKey] = 1;
    } else {
      delete nextCounters[counterKey];
    }
  }

  const progress = getTetrobotAnomalyProgress(nextCounters);
  nextCounters.easter_egg_pop = progress.popFound;
  nextCounters.all_easter_egg = progress.totalFound;
  if (localResetCount > 0 || remoteResetCount > 0) {
    nextCounters.tetrobot_finale_resets = Math.max(localResetCount, remoteResetCount);
  }

  return nextCounters;
}

function clearTetrobotAnomalyCounters(counters: AchievementStats["counters"]) {
  const nextCounters = { ...counters };

  for (const egg of ALL_TETROBOT_ANOMALIES) {
    delete nextCounters[getTetrobotAnomalyCounterKey(egg.id)];
  }

  nextCounters.easter_egg_pop = 0;
  nextCounters.all_easter_egg = 0;
  nextCounters.tetrobot_finale_state_observe = 0;
  nextCounters.tetrobot_finale_state_break = 0;
  nextCounters.tetrobot_deep_layer_access = 0;
  nextCounters.tetrobot_pixel_watching = 0;

  return nextCounters;
}

export function pickRandomTetrobotAnomaly(
  counters: AchievementStats["counters"],
  random = Math.random
) {
  const unresolved = ALL_TETROBOT_ANOMALIES.filter(
    (egg) => !isTetrobotAnomalyFound(counters, egg.id)
  );
  const preferredPool =
    unresolved.length > 0 && random() < 0.82 ? unresolved : ALL_TETROBOT_ANOMALIES;

  return preferredPool[Math.floor(random() * preferredPool.length)] ?? null;
}

export function getTetrobotAnomalyStage(coreFound: number): TetrobotAnomalyStage {
  if (coreFound >= TETROBOT_ANOMALY_CORE_TOTAL) {
    return {
      id: "breach",
      title: "BRECHE STABLE",
      text: "Pixel parle maintenant sans filtre. Le reseau sait que tu vois les fragments caches.",
      accent: "#ffe39d",
    };
  }

  if (coreFound >= 10) {
    return {
      id: "pulse",
      title: "CORRELATION ACTIVE",
      text: "Pulse confirme que plusieurs phrases ne proviennent pas du noyau normal des Tetrobots.",
      accent: "#8fd2ff",
    };
  }

  if (coreFound >= 5) {
    return {
      id: "rookie",
      title: "SIGNAL PERTURBE",
      text: "Rookie commence a remarquer les ruptures de ton et les phrases qui ne ressemblent plus au protocole habituel.",
      accent: "#8bffbf",
    };
  }

  if (coreFound >= 1) {
    return {
      id: "pixel",
      title: "PIXEL ECOUTE",
      text: "Pixel a detecte que tu observes les anomalies plutot que les ignorer. Continue a analyser les fragments suspects.",
      accent: "#d2a8ff",
    };
  }

  return {
    id: "dormant",
    title: "ARCHIVE DORMANTE",
    text: "Le journal reste instable. Les fragments caches apparaissent parfois dans le chatbot du dashboard.",
    accent: "#8ec2ff",
  };
}

export function isPopCultureTetrobotAnomaly(id: string) {
  return TETROBOT_POP_ANOMALY_ID_SET.has(id);
}

export function getTetrobotFinaleState(
  counters: AchievementStats["counters"]
): TetrobotFinaleState {
  const progress = getTetrobotAnomalyProgress(counters);
  const choice =
    (counters.tetrobot_finale_state_break ?? 0) > 0
      ? "break"
      : (counters.tetrobot_finale_state_observe ?? 0) > 0
        ? "observe"
        : null;

  return {
    allFound: progress.totalFound >= progress.totalCount,
    canTrigger: progress.totalFound >= progress.totalCount && choice === null,
    choice,
    deepLayerUnlocked: (counters.tetrobot_deep_layer_access ?? 0) > 0,
    pixelWatching:
      choice === "observe" ||
      choice === "break" ||
      (counters.tetrobot_pixel_watching ?? 0) > 0,
  };
}

export function applyTetrobotFinaleChoice(
  counters: AchievementStats["counters"],
  choice: TetrobotFinaleChoice
) {
  if (choice === "reset") {
    const nextCounters = clearTetrobotAnomalyCounters(counters);
    nextCounters.tetrobot_finale_resets = (counters.tetrobot_finale_resets ?? 0) + 1;
    return nextCounters;
  }

  return {
    ...counters,
    tetrobot_finale_state_observe: choice === "observe" ? 1 : 0,
    tetrobot_finale_state_break: choice === "break" ? 1 : 0,
    tetrobot_finale_choice_observe:
      (counters.tetrobot_finale_choice_observe ?? 0) + (choice === "observe" ? 1 : 0),
    tetrobot_finale_choice_break:
      (counters.tetrobot_finale_choice_break ?? 0) + (choice === "break" ? 1 : 0),
    tetrobot_deep_layer_access:
      choice === "break" ? 1 : (counters.tetrobot_deep_layer_access ?? 0),
    tetrobot_pixel_watching: 1,
  };
}
