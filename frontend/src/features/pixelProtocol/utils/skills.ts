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
  return value.filter((skill): skill is PixelSkill => allowed.includes(skill as PixelSkill));
}

export function readLocalPixelProtocolSkills(): PixelSkill[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return normalizeSkills(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function writeLocalPixelProtocolSkills(skills: PixelSkill[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(new Set(skills))));
}

export function mergePixelProtocolSkills(
  current: PixelSkill[],
  incoming: PixelSkill[]
): PixelSkill[] {
  return Array.from(new Set([...current, ...incoming]));
}
