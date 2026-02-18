// Composant UI BotSpeechBubble.tsx.
type Props = {
  message: string;
  speaker: string;
  accentColor: string;
};

export function BotSpeechBubble({ message, speaker, accentColor }: Props) {
  return (
    <div
      className="bot-speech"
      style={{
        borderColor: accentColor,
        boxShadow: `0 0 10px ${accentColor}55`,
      }}
    >
      <p className="bot-speech__speaker" style={{ color: accentColor }}>
        {speaker}
      </p>
      <p className="bot-speech__text">{message}</p>
    </div>
  );
}
