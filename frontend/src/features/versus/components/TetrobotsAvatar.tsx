import { useEffect, useState } from "react";
import type { BotMood } from "../../game/ai/tetrobotsChat";

type Props = {
  mood: BotMood;
  personalityId: "rookie" | "balanced" | "apex";
};

export function TetrobotsAvatar({ mood, personalityId }: Props) {
  const [animate, setAnimate] = useState(false);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const getAvatarSrc = () => {
    if (mood === "glitch") return "/Avatar/glitch.png";
    if (mood === "idle") return `/Avatar/${personalityId}.png`;
    return `/Avatar/${personalityId}_${mood}.png`;
  };

  const currentSrc = getAvatarSrc();
  const fallbackSrc = `/Avatar/${personalityId}.png`;
  const imageSrc = failedSrc === currentSrc ? fallbackSrc : currentSrc;

  useEffect(() => {
    setAnimate(true);
    const t = setTimeout(() => setAnimate(false), 420);
    return () => clearTimeout(t);
  }, [mood]);

  useEffect(() => {
    setFailedSrc(null);
  }, [personalityId, mood]);

  return (
    <div className={`bot-avatar ${mood} ${animate ? "pulse" : ""}`}>
      <img
        src={imageSrc}
        alt={`Tetrobots ${personalityId} ${mood}`}
        className="bot-avatar__image"
        onError={() => setFailedSrc(currentSrc)}
      />
    </div>
  );
}
