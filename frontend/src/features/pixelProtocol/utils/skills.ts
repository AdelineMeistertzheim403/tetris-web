import { createStoredJsonValue } from "../../app/logic/localStorageValue";
import type { PixelSkill } from "../types";

const STORAGE_KEY = "pixel-protocol-unlocked-skills-v1";

function normalizeSkills(value: unknown): PixelSkill[] {
  if (!Array.isArray(value)) return [];
  const allowed: PixelSkill[] = [
    "DATA_GRAPPLE",
    "OVERJUMP",
    "PHASE_SHIFT",
    "PULSE_SHOCK",
    "OVERCLOCK_MODE",
    "TIME_BUFFER",
    "PLATFORM_SPAWN",
  ];
  return Array.from(
    new Set(value.filter((skill): skill is PixelSkill => allowed.includes(skill as PixelSkill)))
  );
}

const skillsStore = createStoredJsonValue<PixelSkill[]>({
  storageKey: STORAGE_KEY,
  fallback: [],
  normalize: normalizeSkills,
  serialize: normalizeSkills,
});

export const readLocalPixelProtocolSkills = skillsStore.read;
export const writeLocalPixelProtocolSkills = skillsStore.write;

export function mergePixelProtocolSkills(
  current: PixelSkill[],
  incoming: PixelSkill[]
): PixelSkill[] {
  return Array.from(new Set([...current, ...incoming]));
}
