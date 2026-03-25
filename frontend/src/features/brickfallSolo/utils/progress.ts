import { createStoredValue } from "../../app/logic/localStorageValue";
import { CAMPAIGN_TOTAL_LEVELS } from "../data/campaignLevels";

const STORAGE_KEY = "brickfall-solo-campaign-progress-v1";

export function clampBrickfallSoloCampaignLevel(level: number) {
  const normalized = Number.isFinite(level) ? Math.floor(level) : 1;
  return Math.max(1, Math.min(CAMPAIGN_TOTAL_LEVELS, normalized));
}

const progressStore = createStoredValue<number>({
  storageKey: STORAGE_KEY,
  fallback: 1,
  parse: (raw) => {
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? clampBrickfallSoloCampaignLevel(parsed) : 1;
  },
  serialize: (level) => String(clampBrickfallSoloCampaignLevel(level)),
});

export const readLocalBrickfallSoloProgress = progressStore.read;
export const writeLocalBrickfallSoloProgress = progressStore.write;

export function mergeBrickfallSoloProgress(localLevel: number, remoteLevel: number) {
  return Math.max(
    clampBrickfallSoloCampaignLevel(localLevel),
    clampBrickfallSoloCampaignLevel(remoteLevel)
  );
}
