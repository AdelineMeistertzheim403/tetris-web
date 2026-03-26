import type {
  BotMood,
  BotState,
  TetrobotLevelUp,
} from "../../achievements/types/tetrobots";
import type {
  DashboardBot,
  DashboardRelationChoice,
  DashboardRelationEvent,
  DashboardRelationSceneLine,
} from "../../tetrobots/logic/dashboardNarrative";
import type {
  TetrobotAnomaly,
  TetrobotAnomalyProgress,
  TetrobotAnomalySpeaker,
  TetrobotAnomalySpeakerMeta,
} from "../../tetrobots/logic/tetrobotAnomalies";

export type DashboardChatLine = {
  bot: DashboardBot;
  speaker: TetrobotAnomalySpeaker;
  text: string;
  anomaly?: TetrobotAnomaly | null;
};

export type DashboardActiveBotViewModel = {
  bot: DashboardBot;
  state?: BotState;
  accentColor: string;
  affinity: number;
  mood: BotMood;
  avatar: string;
};

export type DashboardChatbotFeedback = {
  tone: "success" | "error" | "info";
  text: string;
};

export type DashboardChatbotViewModel = {
  activeBot: DashboardActiveBotViewModel;
  chatLine: DashboardChatLine;
  canReopenLatestEvent: boolean;
  relationEvent: DashboardRelationEvent | null;
  relationSummary: string;
  speaker: TetrobotAnomalySpeakerMeta & {
    id: TetrobotAnomalySpeaker;
    showRelationData: boolean;
  };
  anomalyFeedback: DashboardChatbotFeedback | null;
  anomalyProgress: TetrobotAnomalyProgress;
  hasActiveAnomaly: boolean;
};

export type DashboardTipViewModel = {
  activeBot: DashboardActiveBotViewModel;
  levelUpNotice: TetrobotLevelUp;
  tetrobotTip: string;
};

export type DashboardRelationOverlayViewModel = {
  popup: DashboardRelationEvent | null;
  scene: DashboardRelationSceneLine[];
  choices: DashboardRelationChoice[];
};

export type DashboardChatbotActions = {
  analyzeAnomaly: () => void;
  openHelp: () => void;
  openLatestEvent: () => void;
  openAnomalies: () => void;
  openRelation: () => void;
};
