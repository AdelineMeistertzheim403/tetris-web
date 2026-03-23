import { POWERUP_ROTATION, createMessage, getPowerupLabel } from "../model";
import type { GameState, Message, PickupType, WaveTheme } from "../model";

/** Sélectionne le message d'introduction adapté à la vague à venir. */
export function getWaveStartMessage(
  wave: number,
  theme: WaveTheme,
  bossCount = 0,
  bossTheme?: Exclude<WaveTheme, "standard">,
  finale = false
): Message {
  if (wave === 1) {
    return createMessage("rookie", "info", "Acte Rookie. Reste mobile, lis les trajectoires, prends le rythme.");
  }

  if (wave === 11) {
    return createMessage("pulse", "info", "Acte Pulse. Les formations serrent la ligne, vise avant de tirer.");
  }

  if (wave === 21) {
    return createMessage("apex", "boss", "Acte Apex. Le secteur n'offre plus aucune erreur gratuite.");
  }

  if ([31, 41, 51, 61, 71, 81, 91].includes(wave)) {
    return createMessage(
      theme === "rookie" ? "rookie" : theme === "pulse" ? "pulse" : "apex",
      theme === "apex" ? "boss" : "info",
      wave >= 91
        ? "Cycle final. Les vieux patterns reviennent avec plus de blindage."
        : `Nouveau cycle. Niveau ${theme === "rookie" ? "Rookie" : theme === "pulse" ? "Pulse" : "Apex"} renforce.`
    );
  }

  if (wave === 95) {
    return createMessage("pulse", "boss", "Prelude finale. Rookie, Pulse et Apex reviennent pour un dernier test.");
  }

  if (bossCount > 0 && bossTheme) {
    if (finale) {
      return createMessage(
        bossTheme === "rookie" ? "rookie" : bossTheme === "pulse" ? "pulse" : "apex",
        "boss",
        bossTheme === "rookie"
          ? "Boss final Rookie detecte. Le vieux chassis tient encore la ligne."
          : bossTheme === "pulse"
            ? "Boss final Pulse en approche. Precision maximale requise."
            : "Boss final Apex actif. Finis le protocole."
      );
    }

    return createMessage(
      bossTheme === "rookie" ? "rookie" : bossTheme === "pulse" ? "pulse" : "apex",
      "boss",
      bossCount > 1
        ? bossTheme === "rookie"
          ? `${bossCount} bosses Rookie detectes. Formation lourde mais lisible.`
          : bossTheme === "pulse"
            ? `${bossCount} bosses Pulse detectes. Cadence et pression en hausse.`
            : `${bossCount} bosses Apex detectes. Secteur sous protocole critique.`
        : bossTheme === "rookie"
          ? `Boss Rookie vague ${wave}. Un chassis veterant descend.`
          : bossTheme === "pulse"
            ? `Boss Pulse vague ${wave}. Pattern serre, vise proprement.`
            : `Boss Apex vague ${wave}. Tiens la ligne.`
    );
  }

  if (theme === "pulse") {
    return createMessage("pulse", "info", `Vague Pulse ${wave}. Formation precise, cadence en hausse.`);
  }

  if (theme === "rookie") {
    return createMessage("rookie", "info", `Vague Rookie ${wave}. Beaucoup de cibles, reste propre.`);
  }

  if (wave >= 3) {
    return createMessage("pulse", "info", "Formation mise a jour. Surveille le flanc gauche.");
  }

  return createMessage("rookie", "info", "Pixel, reste mobile. La premiere vague est legere.");
}

/** Fait tourner la récompense d'arme à chaque ligne explosive réussie. */
export function getNextWeaponPowerup(lineBursts: number): PickupType {
  return POWERUP_ROTATION[(lineBursts - 1) % POWERUP_ROTATION.length];
}

/** Message de feedback émis après une bombe. */
export function getBombMessage(powerup: PickupType, lineGain: number) {
  return lineGain > 0
    ? `Bombe declenchee. Module ${getPowerupLabel(powerup)} largue.`
    : "Bombe declenchee. Zone temporairement nettoyee.";
}

/** Message de feedback émis après une ou plusieurs lignes explosives. */
export function getLineBurstMessage(powerup: PickupType, clearedRows: number) {
  return clearedRows > 1
    ? `Explosion multi-lignes. Module ${getPowerupLabel(powerup)} largue.`
    : `Ligne explosive. Module ${getPowerupLabel(powerup)} largue.`;
}

/** Message de pression utilisé dès que le joueur subit une menace réelle. */
export function escalateMessage(state: GameState): Message {
  if (state.wave % 5 === 0) {
    return createMessage("apex", "boss", "N'echange pas des degats. Apex lit deja ton rythme.");
  }

  if (state.shield <= 2 || state.lives === 1) {
    return createMessage("rookie", "warning", "Bouclier critique. Dash d'abord, tire ensuite.");
  }

  return createMessage("pulse", "info", "Anticipe le balayage, puis casse le centre.");
}

/** Message d'ambiance injecté quand aucun événement majeur n'est survenu récemment. */
export function getAmbientCombatMessage(wave: number): Message {
  return wave % 5 === 0
    ? createMessage("apex", "boss", "Tu tires trop tot. Lis les ouvertures.")
    : wave >= 3
      ? createMessage("pulse", "info", "Pattern stable. Brise les cellules exterieures.")
      : createMessage("rookie", "info", "Continue de bouger, Pixel. La voie est encore libre.");
}

/** Message radio contextuel déclenché par une fenêtre de pression de la formation. */
export function getFormationRadioMessage(
  theme: WaveTheme,
  mode: "opening" | "compression" | "punish"
): Message {
  if (theme === "rookie") {
    return createMessage(
      "rookie",
      "info",
      mode === "opening"
        ? "Ouverture propre. Tire maintenant, puis replace-toi."
        : "Ils restent lisibles. Garde ton rythme."
    );
  }

  if (theme === "pulse") {
    return createMessage(
      "pulse",
      mode === "compression" ? "warning" : "info",
      mode === "compression"
        ? "La formation se resserre. Prepare une salve rapide."
        : "Ca se rouvre. Reprends l'angle central."
    );
  }

  return createMessage(
    "apex",
    "boss",
    mode === "punish"
      ? "Fenetre de punition active. Survis d'abord, riposte ensuite."
      : "Le desaxage baisse. Reprends l'initiative."
  );
}

/** Message final de défaite. */
export function getGameOverMessage(): Message {
  return createMessage("rookie", "warning", "On s'est fait submerger. Redemarre le secteur.");
}

/** Message final de victoire. */
export function getVictoryMessage(): Message {
  return createMessage("apex", "success", "Secteur nettoye. Tu as survecu au soulevement.");
}
