import type { Perk } from "../types/Perk";

export const ALL_PERKS: Perk[] = [
 {
  id: "extra-hold",
  name: "+1 HOLD",
  description: "Stockez une pièce supplémentaire",
  rarity: "common",
},
{
  id: "soft-gravity",
  name: "GRAVITÉ DOUCE",
  description: "La gravité est légèrement réduite",
  rarity: "common",
},
{
  id: "score-boost",
  name: "BONUS DE SCORE",
  description: "+50% de score pendant la run",
  rarity: "common",
},
{
  id: "bomb",
  name: "BOMBE",
  description: "Détruit une zone 3x3",
  rarity: "common",
},
{
  id: "slow-gravity",
  name: "GRAVITÉ LENTE",
  description: "La vitesse de chute est fortement réduite",
  rarity: "rare",
},
{
  id: "double-bomb",
  name: "DOUBLE BOMBE",
  description: "Gagne 2 bombes",
  rarity: "rare",
},
{
  id: "second-chance",
  name: "SECONDE CHANCE",
  description: "Ignore un game over",
  rarity: "rare",
},
{
  id: "fast-hold-reset",
  name: "HOLD FLEXIBLE",
  description: "Le hold est réinitialisé plus souvent",
  rarity: "rare",
},
{
  id: "mega-bomb",
  name: "MÉGA BOMBE",
  description: "Explosion en zone 5x5",
  rarity: "epic",
},
{
  id: "time-freeze",
  name: "ARRÊT DU TEMPS",
  description: "La gravité est stoppée pendant 5 secondes",
  rarity: "epic",
},
{
  id: "chaos-mode",
  name: "MODE CHAOS",
  description: "Les effets sont amplifiés et imprévisibles",
  rarity: "epic",
},
{
  id: "last-stand",
  name: "DERNIER ESPOIR",
  description: "Quand le jeu devrait se terminer, la gravité ralentit fortement",
  rarity: "epic",
},

];
