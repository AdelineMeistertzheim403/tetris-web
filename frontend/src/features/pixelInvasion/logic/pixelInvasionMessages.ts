import { POWERUP_ROTATION, createMessage, getPowerupLabel } from "../model";
import type { GameState, Message, WaveTheme } from "../model";

/** Sélectionne le message d'introduction adapté à la vague à venir. */
export function getWaveStartMessage(wave: number, theme: WaveTheme, apexCount = 0): Message {
  if (theme === "apex") {
    return createMessage(
      "apex",
      "boss",
      apexCount > 1
        ? `Escouade Apex detectee. ${apexCount} elites descendent.`
        : "Protocole Apex actif. Tiens la ligne."
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
export function getNextWeaponPowerup(lineBursts: number) {
  return POWERUP_ROTATION[(lineBursts - 1) % POWERUP_ROTATION.length];
}

/** Message de feedback émis après une bombe. */
export function getBombMessage(powerup: GameState["weaponPowerup"], lineGain: number) {
  return lineGain > 0
    ? `Bombe declenchee. ${getPowerupLabel(powerup)} active.`
    : "Bombe declenchee. Zone temporairement nettoyee.";
}

/** Message de feedback émis après une ou plusieurs lignes explosives. */
export function getLineBurstMessage(powerup: GameState["weaponPowerup"], clearedRows: number) {
  return clearedRows > 1
    ? `Explosion multi-lignes. ${getPowerupLabel(powerup)} active.`
    : `Ligne explosive. ${getPowerupLabel(powerup)} active.`;
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

/** Message final de défaite. */
export function getGameOverMessage(): Message {
  return createMessage("rookie", "warning", "On s'est fait submerger. Redemarre le secteur.");
}

/** Message final de victoire. */
export function getVictoryMessage(): Message {
  return createMessage("apex", "success", "Secteur nettoye. Tu as survecu au soulevement.");
}
