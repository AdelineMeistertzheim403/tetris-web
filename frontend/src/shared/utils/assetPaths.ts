// Utilitaires purs reutilisables pour ce module.
export const ACHIEVEMENT_ICON_BASE = "/Achievments";
export const PERK_ICON_BASE = "/Perks";
export const MUTATION_ICON_BASE = "/Mutations";
export const SYNERGY_ICON_BASE = "/Synergies";

export const achievementIconPath = (icon: string) =>
  `${ACHIEVEMENT_ICON_BASE}/${icon}.png`;

export const perkIconPath = (icon: string) => `${PERK_ICON_BASE}/${icon}.png`;

export const mutationIconPath = (icon: string) =>
  `${MUTATION_ICON_BASE}/${icon}.png`;

export const synergyIconPath = (icon: string) =>
  `${SYNERGY_ICON_BASE}/${icon}.png`;
