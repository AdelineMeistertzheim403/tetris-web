import { useEffect, useRef } from "react";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  ENEMY_COLORS,
  getEnemySpriteTemplate,
} from "../model";
import type { Bullet, Drop, Enemy, Impact, Telegraph } from "../model";

type PixelInvasionEntityCanvasProps = {
  enemies: Enemy[];
  telegraphs: Telegraph[];
  impacts: Impact[];
  playerBullets: Bullet[];
  enemyBullets: Bullet[];
  drops: Drop[];
  reducedFx: boolean;
};

function impactColor(type: Impact["type"]) {
  switch (type) {
    case "laser":
    case "player-laser":
      return "#6df7ff";
    case "fan":
      return "#d18fff";
    case "heavy":
    case "player-piercing":
      return "#ffe066";
    case "zigzag":
      return "#94ffc0";
    case "dash":
    case "player-charge":
      return "#ff9b54";
    case "player-hit":
      return "#ff8282";
    case "enemy-break":
      return "#ffffff";
    default:
      return "#6ffaff";
  }
}

function bulletColor(bullet: Bullet) {
  if (bullet.sourceKind === "PLAYER") {
    switch (bullet.visualType) {
      case "laser":
        return "#94e8ff";
      case "piercing":
        return "#ffc95f";
      case "charge":
        return "#ffb061";
      default:
        return "#6ffaff";
    }
  }

  switch (bullet.sourceKind) {
    case "I":
      return "#71f7ff";
    case "T":
      return "#d99aff";
    case "O":
      return "#ffe066";
    case "S":
    case "Z":
      return "#78ffb3";
    default:
      return "#ff9090";
  }
}

function telegraphColor(type: Telegraph["type"]) {
  switch (type) {
    case "beam":
      return "#71f7ff";
    case "fan":
      return "#d99aff";
    case "heavy":
      return "#ffe066";
    case "zigzag":
      return "#78ffb3";
    default:
      return "#ff9b54";
  }
}

function dropColor(type: Drop["type"]) {
  switch (type) {
    case "multi_shot":
      return "#3fc9ff";
    case "laser":
      return "#2de4ff";
    case "piercing":
      return "#ffb24f";
    case "charge":
      return "#c86dff";
    case "slow_field":
      return "#50e985";
  }
}

function dropLabel(type: Drop["type"]) {
  switch (type) {
    case "multi_shot":
      return "M";
    case "laser":
      return "L";
    case "piercing":
      return "P";
    case "charge":
      return "C";
    case "slow_field":
      return "S";
  }
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawTelegraph(
  ctx: CanvasRenderingContext2D,
  telegraph: Telegraph,
  scaleX: number,
  scaleY: number,
  reducedFx: boolean
) {
  const x = telegraph.x * scaleX;
  const y = telegraph.y * scaleY;
  const w = telegraph.width * scaleX;
  const h = telegraph.height * scaleY;
  const color = telegraphColor(telegraph.type);

  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (telegraph.angle) ctx.rotate((telegraph.angle * Math.PI) / 180);
  ctx.globalAlpha = reducedFx ? 0.4 : 0.82;
  if (!reducedFx) {
    ctx.shadowBlur = telegraph.type === "heavy" ? 16 : 12;
    ctx.shadowColor = color;
  }

  if (telegraph.type === "heavy") {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.16);
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (telegraph.type === "fan") {
    const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    grad.addColorStop(0, "rgba(255,255,255,0.7)");
    grad.addColorStop(0.2, color);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    roundedRectPath(ctx, -w / 2, -h / 2, w, h, Math.max(4, h / 2));
    ctx.fill();
  } else if (telegraph.type === "zigzag") {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, h * 0.45);
    ctx.lineCap = "round";
    ctx.beginPath();
    const steps = 6;
    for (let i = 0; i <= steps; i += 1) {
      const px = -w / 2 + (w / steps) * i;
      const py = i % 2 === 0 ? -h / 2 : h / 2;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  } else {
    const grad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.25, color);
    grad.addColorStop(0.5, "rgba(255,255,255,0.9)");
    grad.addColorStop(0.75, color);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    roundedRectPath(ctx, -w / 2, -h / 2, w, h, Math.max(4, h / 2));
    ctx.fill();
  }

  if (!reducedFx && telegraph.type !== "heavy") {
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    roundedRectPath(
      ctx,
      -w * 0.18,
      -h * 0.34,
      w * 0.36,
      Math.max(2, h * 0.18),
      Math.max(2, h * 0.12)
    );
    ctx.fill();
  }

  ctx.restore();
}

function drawBullet(
  ctx: CanvasRenderingContext2D,
  bullet: Bullet,
  scaleX: number,
  scaleY: number,
  reducedFx: boolean
) {
  const x = bullet.x * scaleX;
  const y = bullet.y * scaleY;
  const w = Math.max(3, bullet.width * scaleX);
  const h = Math.max(4, bullet.height * scaleY);
  const color = bulletColor(bullet);

  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.95;
  if (!reducedFx) {
    ctx.shadowBlur = bullet.sourceKind === "PLAYER" ? 10 : 8;
    ctx.shadowColor = color;
  }

  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  const sheen = ctx.createLinearGradient(x, y, x, y + h);
  sheen.addColorStop(0, "rgba(255,255,255,0.8)");
  sheen.addColorStop(0.35, "rgba(255,255,255,0.18)");
  sheen.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = 0.58;
  ctx.fillStyle = sheen;
  ctx.beginPath();
  ctx.ellipse(
    x + w / 2,
    y + h * 0.34,
    Math.max(1, w * 0.28),
    Math.max(1, h * 0.2),
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  if (!reducedFx) {
    ctx.globalAlpha = 0.42;
    const tail = ctx.createLinearGradient(x + w / 2, y + h, x + w / 2, y + h * 1.9);
    tail.addColorStop(0, color);
    tail.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = tail;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 1.15, Math.max(1, w * 0.2), Math.max(2, h * 0.48), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawImpact(
  ctx: CanvasRenderingContext2D,
  impact: Impact,
  scaleX: number,
  scaleY: number,
  reducedFx: boolean
) {
  const x = impact.x * scaleX;
  const y = impact.y * scaleY;
  const r = Math.max(3, (impact.size * (scaleX + scaleY)) / 4);
  const color = impactColor(impact.type);
  const alpha = Math.max(0.18, impact.ttl / 0.32);

  ctx.save();
  ctx.globalAlpha = alpha;
  if (!reducedFx) {
    ctx.shadowBlur = 18;
    ctx.shadowColor = color;
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, r * 0.18);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.72, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.globalAlpha = alpha * 0.55;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.34, 0, Math.PI * 2);
  ctx.fill();

  if (!reducedFx) {
    ctx.globalAlpha = alpha * 0.34;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.92, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  scaleX: number,
  scaleY: number,
  reducedFx: boolean
) {
  const template = getEnemySpriteTemplate(enemy.kind);
  const x = enemy.x * scaleX;
  const y = enemy.y * scaleY;
  const width = enemy.width * scaleX;
  const height = enemy.height * scaleY;
  const cols = template.columns;
  const rows = template.rows;
  const cellW = width / cols;
  const cellH = height / rows;
  const color = enemy.color || ENEMY_COLORS[enemy.kind];

  ctx.save();
  if (!reducedFx) {
    ctx.shadowBlur = enemy.kind === "APEX" ? 18 : 10;
    ctx.shadowColor = color;
  }

  const shell = ctx.createLinearGradient(x, y, x, y + height);
  shell.addColorStop(0, "rgba(42,56,98,0.92)");
  shell.addColorStop(1, "rgba(16,24,46,0.9)");
  ctx.fillStyle = shell;
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "rgba(4,7,14,0.94)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);

  template.cells.forEach((cell, index) => {
    if (!cell.filled) return;
    const row = Math.floor(index / cols);
    const col = index % cols;
    const cx = x + col * cellW + 1;
    const cy = y + row * cellH + 1;
    const cw = Math.max(2, cellW - 2);
    const ch = Math.max(2, cellH - 2);

    const grad = ctx.createLinearGradient(cx, cy, cx, cy + ch);
    grad.addColorStop(0, "rgba(255,255,255,0.38)");
    grad.addColorStop(0.16, color);
    grad.addColorStop(0.64, color);
    grad.addColorStop(1, "rgba(8,12,20,0.88)");
    ctx.fillStyle = grad;
    ctx.fillRect(cx, cy, cw, ch);
    ctx.strokeStyle = "rgba(4,7,14,0.95)";
    ctx.lineWidth = 1;
    ctx.strokeRect(cx, cy, cw, ch);

    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fillRect(cx + 1, cy + 1, Math.max(1, cw - 2), Math.max(1, ch * 0.18));
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(cx + 1, cy + ch * 0.72, Math.max(1, cw - 2), Math.max(1, ch * 0.18));
  });

  const coreX = x + width * 0.5;
  const coreY = y + height * 0.5;
  const coreW = Math.max(8, width * 0.22);
  const coreH = Math.max(7, height * 0.16);
  const reactorColor =
    enemy.kind === "O"
      ? "#ffe86a"
      : enemy.kind === "T"
        ? "#f0a8ff"
        : enemy.kind === "L"
          ? "#ffbc86"
          : enemy.kind === "J"
            ? "#95c6ff"
            : enemy.kind === "S"
              ? "#8effb5"
              : enemy.kind === "Z"
                ? "#ff8cab"
                : enemy.kind === "APEX"
                  ? "#ff9d69"
                  : "#9af9ff";

  ctx.fillStyle = "rgba(7,10,18,0.9)";
  roundedRectPath(ctx, coreX - coreW / 2, coreY - coreH / 2, coreW, coreH, 2);
  ctx.fill();

  if (!reducedFx) {
    ctx.shadowBlur = 10;
    ctx.shadowColor = reactorColor;
  }
  const reactor = ctx.createLinearGradient(coreX, coreY - coreH / 2, coreX, coreY + coreH / 2);
  reactor.addColorStop(0, "rgba(255,255,255,0.72)");
  reactor.addColorStop(0.22, reactorColor);
  reactor.addColorStop(1, "rgba(0,0,0,0.24)");
  ctx.fillStyle = reactor;
  roundedRectPath(ctx, coreX - coreW * 0.22, coreY - coreH * 0.22, coreW * 0.44, coreH * 0.44, 1.5);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "rgba(244,251,255,0.92)";
  ctx.beginPath();
  ctx.ellipse(coreX - coreW * 0.2, coreY - coreH * 0.1, Math.max(1, coreW * 0.08), Math.max(1, coreH * 0.16), 0, 0, Math.PI * 2);
  ctx.ellipse(coreX + coreW * 0.2, coreY - coreH * 0.1, Math.max(1, coreW * 0.08), Math.max(1, coreH * 0.16), 0, 0, Math.PI * 2);
  ctx.fill();

  const hpWidth = width * (enemy.hp / enemy.maxHp);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(12,16,28,0.9)";
  ctx.fillRect(x, y + height + 3, width, 4);
  ctx.fillStyle = color;
  ctx.fillRect(x, y + height + 3, hpWidth, 4);
  ctx.restore();
}

export function PixelInvasionEntityCanvas({
  enemies,
  telegraphs,
  impacts,
  playerBullets,
  enemyBullets,
  drops,
  reducedFx,
}: PixelInvasionEntityCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const rect = parent.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const scaleX = width / BOARD_WIDTH;
    const scaleY = height / BOARD_HEIGHT;

    for (const telegraph of telegraphs) {
      drawTelegraph(ctx, telegraph, scaleX, scaleY, reducedFx);
    }

    for (const enemy of enemies) {
      drawEnemy(ctx, enemy, scaleX, scaleY, reducedFx);
    }

    for (const bullet of [...playerBullets, ...enemyBullets]) {
      drawBullet(ctx, bullet, scaleX, scaleY, reducedFx);
    }

    for (const drop of drops) {
      const x = drop.x * scaleX;
      const y = drop.y * scaleY;
      const w = Math.max(10, drop.width * scaleX);
      const h = Math.max(10, drop.height * scaleY);
      const color = dropColor(drop.type);
      ctx.save();
      ctx.fillStyle = color;
      ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.lineWidth = 2;
      if (!reducedFx) {
        ctx.shadowBlur = 14;
        ctx.shadowColor = color;
      }
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = "#04101d";
      ctx.font = `bold ${Math.max(10, Math.floor(h * 0.44))}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(dropLabel(drop.type), x + w / 2, y + h / 2);
      ctx.restore();
    }

    for (const impact of impacts) {
      drawImpact(ctx, impact, scaleX, scaleY, reducedFx);
    }
  }, [drops, enemies, enemyBullets, impacts, playerBullets, reducedFx, telegraphs]);

  return <canvas ref={canvasRef} className="pixel-invasion-entity-canvas" aria-hidden="true" />;
}
