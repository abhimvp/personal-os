interface MovieLogCardProps {
  title: string;
  status: string;
  progress?: string;
  mood_tags?: string[];
  context_tags?: string[];
  notes?: string;
}

const STATUS_COLORS: Record<string, string> = {
  watching: "#3b82f6",
  completed: "#22c55e",
  dropped: "#ef4444",
  planned: "#a855f7",
};

export function MovieLogCard({
  title,
  status,
  progress,
  mood_tags = [],
  context_tags = [],
  notes,
}: MovieLogCardProps) {
  return (
    <div
      style={{
        border: "1px solid #333",
        borderRadius: 10,
        padding: 16,
        backgroundColor: "#111",
        marginBottom: 12,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 20 }}>🎬</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
          <span
            style={{
              fontSize: 11,
              backgroundColor: STATUS_COLORS[status] ?? "#555",
              color: "white",
              padding: "2px 8px",
              borderRadius: 20,
              textTransform: "capitalize",
            }}
          >
            {status}
          </span>
        </div>
      </div>

      {/* Progress */}
      {progress && (
        <div style={{ fontSize: 13, color: "#aaa", marginBottom: 8 }}>
          📍 {progress}
        </div>
      )}

      {/* Mood tags */}
      {mood_tags.length > 0 && (
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}
        >
          {mood_tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 11,
                backgroundColor: "#1e3a5f",
                color: "#93c5fd",
                padding: "3px 8px",
                borderRadius: 20,
              }}
            >
              🎭 {tag}
            </span>
          ))}
        </div>
      )}

      {/* Context tags */}
      {context_tags.length > 0 && (
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}
        >
          {context_tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 11,
                backgroundColor: "#1a2e1a",
                color: "#86efac",
                padding: "3px 8px",
                borderRadius: 20,
              }}
            >
              💡 {tag}
            </span>
          ))}
        </div>
      )}

      {/* Notes */}
      {notes && (
        <div style={{ fontSize: 13, color: "#888", fontStyle: "italic" }}>
          "{notes}"
        </div>
      )}
    </div>
  );
}
