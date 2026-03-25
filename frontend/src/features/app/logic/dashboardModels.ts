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

export type DashboardChatLine = {
  bot: DashboardBot;
  text: string;
};

export type DashboardActiveBotViewModel = {
  bot: DashboardBot;
  state?: BotState;
  accentColor: string;
  affinity: number;
  mood: BotMood;
  avatar: string;
};

export type DashboardChatbotViewModel = {
  activeBot: DashboardActiveBotViewModel;
  chatLine: DashboardChatLine;
  canReopenLatestEvent: boolean;
  relationEvent: DashboardRelationEvent | null;
  relationSummary: string;
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
  openHelp: () => void;
  openLatestEvent: () => void;
  openRelation: () => void;
};
