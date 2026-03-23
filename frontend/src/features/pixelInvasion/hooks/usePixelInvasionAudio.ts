import { useEffect, useRef, useState } from "react";
import type { GameState, WeaponPowerup } from "../model";

const PIXEL_INVASION_AUDIO_MUTED_KEY = "pixel-invasion-audio-muted";

type AudioNodes = {
  context: AudioContext;
  master: GainNode;
};

function createAudioNodes(): AudioNodes | null {
  if (typeof window === "undefined") return null;
  const AudioCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;

  const context = new AudioCtor();
  const master = context.createGain();
  master.gain.value = 0.18;
  master.connect(context.destination);
  return { context, master };
}

function rampOut(gain: GainNode, now: number, duration: number, peak: number) {
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
}

function connectBlasterChain(nodes: AudioNodes, peak = 0.08) {
  const gain = nodes.context.createGain();
  const filter = nodes.context.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1600;
  filter.Q.value = 1.8;
  gain.connect(filter);
  filter.connect(nodes.master);
  rampOut(gain, nodes.context.currentTime, 0.16, peak);
  return gain;
}

function playShot(nodes: AudioNodes, powerup: WeaponPowerup) {
  const now = nodes.context.currentTime;

  if (powerup === "laser") {
    const gain = connectBlasterChain(nodes, 0.09);
    const osc = nodes.context.createOscillator();
    const osc2 = nodes.context.createOscillator();
    osc.type = "sawtooth";
    osc2.type = "square";
    osc.frequency.setValueAtTime(1480, now);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.14);
    osc2.frequency.setValueAtTime(820, now);
    osc2.frequency.exponentialRampToValueAtTime(180, now + 0.11);
    osc.connect(gain);
    osc2.connect(gain);
    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.15);
    osc2.stop(now + 0.12);
    return;
  }

  if (powerup === "piercing") {
    const gain = connectBlasterChain(nodes, 0.085);
    const osc = nodes.context.createOscillator();
    const osc2 = nodes.context.createOscillator();
    osc.type = "square";
    osc2.type = "triangle";
    osc.frequency.setValueAtTime(720, now);
    osc.frequency.exponentialRampToValueAtTime(130, now + 0.18);
    osc2.frequency.setValueAtTime(420, now);
    osc2.frequency.exponentialRampToValueAtTime(90, now + 0.16);
    osc.connect(gain);
    osc2.connect(gain);
    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.18);
    osc2.stop(now + 0.16);
    return;
  }

  if (powerup === "charge") {
    const gain = connectBlasterChain(nodes, 0.1);
    const osc = nodes.context.createOscillator();
    const mod = nodes.context.createOscillator();
    const modGain = nodes.context.createGain();
    osc.type = "sawtooth";
    mod.type = "sine";
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.04);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.22);
    mod.frequency.setValueAtTime(24, now);
    modGain.gain.setValueAtTime(28, now);
    mod.connect(modGain);
    modGain.connect(osc.frequency);
    osc.connect(gain);
    osc.start(now);
    mod.start(now);
    osc.stop(now + 0.22);
    mod.stop(now + 0.22);
    return;
  }

  const gain = connectBlasterChain(nodes, 0.075);
  const osc = nodes.context.createOscillator();
  const osc2 = nodes.context.createOscillator();
  osc.type = "sawtooth";
  osc2.type = "triangle";
  osc.frequency.setValueAtTime(1120, now);
  osc.frequency.exponentialRampToValueAtTime(240, now + 0.12);
  osc2.frequency.setValueAtTime(620, now);
  osc2.frequency.exponentialRampToValueAtTime(150, now + 0.1);
  osc.connect(gain);
  osc2.connect(gain);
  osc.start(now);
  osc2.start(now);
  osc.stop(now + 0.13);
  osc2.stop(now + 0.11);
}

function playDash(nodes: AudioNodes) {
  const now = nodes.context.currentTime;
  const gain = nodes.context.createGain();
  const osc = nodes.context.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(70, now + 0.08);
  rampOut(gain, now, 0.1, 0.05);
  osc.connect(gain);
  gain.connect(nodes.master);
  osc.start(now);
  osc.stop(now + 0.1);
}

function playBomb(nodes: AudioNodes) {
  const now = nodes.context.currentTime;
  const gain = nodes.context.createGain();
  const osc = nodes.context.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(110, now);
  osc.frequency.exponentialRampToValueAtTime(45, now + 0.28);
  rampOut(gain, now, 0.3, 0.11);
  osc.connect(gain);
  gain.connect(nodes.master);
  osc.start(now);
  osc.stop(now + 0.3);
}

export function usePixelInvasionAudio(game: GameState) {
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(PIXEL_INVASION_AUDIO_MUTED_KEY) === "1";
  });
  const audioRef = useRef<AudioNodes | null>(null);
  const lastShotCooldownRef = useRef(0);
  const lastDashCooldownRef = useRef(0);
  const lastBombCooldownRef = useRef(0);

  useEffect(() => {
    function unlockAudio() {
      if (muted) return;
      audioRef.current ??= createAudioNodes();
      if (audioRef.current?.context.state === "suspended") {
        void audioRef.current.context.resume();
      }
    }

    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    window.addEventListener("keydown", unlockAudio);
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, [muted]);

  useEffect(() => {
    window.localStorage.setItem(PIXEL_INVASION_AUDIO_MUTED_KEY, muted ? "1" : "0");
    if (muted) return;
    audioRef.current ??= createAudioNodes();
  }, [muted]);

  useEffect(() => {
    if (muted) {
      lastShotCooldownRef.current = game.shotCooldown;
      lastDashCooldownRef.current = game.dashCooldown;
      lastBombCooldownRef.current = game.bombCooldown;
      return;
    }

    const nodes = audioRef.current;
    if (!nodes || nodes.context.state !== "running") {
      lastShotCooldownRef.current = game.shotCooldown;
      lastDashCooldownRef.current = game.dashCooldown;
      lastBombCooldownRef.current = game.bombCooldown;
      return;
    }

    if (game.shotCooldown > lastShotCooldownRef.current + 0.04) {
      playShot(nodes, game.weaponPowerup);
    }

    if (game.dashCooldown > lastDashCooldownRef.current + 0.2) {
      playDash(nodes);
    }

    if (game.bombCooldown > lastBombCooldownRef.current + 0.2) {
      playBomb(nodes);
    }

    lastShotCooldownRef.current = game.shotCooldown;
    lastDashCooldownRef.current = game.dashCooldown;
    lastBombCooldownRef.current = game.bombCooldown;
  }, [game.bombCooldown, game.dashCooldown, game.shotCooldown, game.weaponPowerup, muted]);

  function toggleMute() {
    setMuted((current) => !current);
  }

  return { muted, toggleMute };
}
