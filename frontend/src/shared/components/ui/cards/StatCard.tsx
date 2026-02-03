type StatCardProps = {
  label: string;
  value: number | string;
  accentColor?: string;
  valueColor?: string;
};

export default function StatCard({
  label,
  value,
  accentColor = "#f5f5f5",
  valueColor,
}: StatCardProps) {
  return (
    <div style={{ width: "100%", textAlign: "center" }}>
      {label ? (
        <h3
          style={{
            marginBottom: "8px",
            fontSize: "1rem",
            letterSpacing: "1px",
            color: accentColor,
          }}
        >
          {label}
        </h3>
      ) : null}
      <div
        style={{
          background: "var(--ui-board-bg, #000)",
          border: "2px solid var(--ui-board-border, #444)",
          borderRadius: "6px",
          padding: "12px",
          fontSize: "1.2rem",
          fontWeight: "bold",
          color: valueColor ?? accentColor,
          textShadow: valueColor ? undefined : "0 0 6px rgba(0,234,255,0.7)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
