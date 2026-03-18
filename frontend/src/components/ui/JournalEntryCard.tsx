interface JournalEntryCardProps {
  content: string;
  mood?: string;
  tags?: string[];
  reminder_days?: number;
}

const MOOD_STYLES: Record<
  string,
  { bg: string; color: string; emoji: string }
> = {
  happy: { bg: "#1a2e1a", color: "#86efac", emoji: "😊" },
  sad: { bg: "#1e1a2e", color: "#c4b5fd", emoji: "😔" },
  reflective: { bg: "#1a1e2e", color: "#93c5fd", emoji: "🤔" },
  anxious: { bg: "#2e1a1a", color: "#fca5a5", emoji: "😰" },
  excited: { bg: "#2e2a1a", color: "#fde68a", emoji: "🤩" },
  grateful: { bg: "#1a2e2a", color: "#6ee7b7", emoji: "🙏" },
  neutral: { bg: "#1e1e1e", color: "#d1d5db", emoji: "😐" },
};

export function JournalEntryCard({
  content,
  mood,
  tags = [],
  reminder_days = 7,
}: JournalEntryCardProps) {
  const moodStyle = mood ? (MOOD_STYLES[mood] ?? MOOD_STYLES.neutral) : null;
  const today = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      style={{
        border: "1px solid #2a2a2a",
        borderRadius: 10,
        padding: 16,
        backgroundColor: "#0d0d0d",
        marginBottom: 12,
        borderLeft: "3px solid #6366f1",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>📓</span>
          <span style={{ fontSize: 12, color: "#666" }}>{today}</span>
        </div>
        {moodStyle && (
          <span
            style={{
              fontSize: 11,
              backgroundColor: moodStyle.bg,
              color: moodStyle.color,
              padding: "3px 10px",
              borderRadius: 20,
              textTransform: "capitalize",
            }}
          >
            {moodStyle.emoji} {mood}
          </span>
        )}
      </div>

      {/* Content */}
      <p
        style={{
          fontSize: 14,
          color: "#e5e5e5",
          lineHeight: 1.6,
          marginBottom: tags.length > 0 ? 10 : 0,
          fontStyle: "italic",
        }}
      >
        "{content}"
      </p>

      {/* Tags + Reminder */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 11,
                backgroundColor: "#1e1e2e",
                color: "#818cf8",
                padding: "2px 8px",
                borderRadius: 20,
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
        <span style={{ fontSize: 11, color: "#555" }}>
          🔔 revisit in {reminder_days}d
        </span>
      </div>
    </div>
  );
}
