import { useEffect, useState } from "react";

interface JournalEntry {
  id: number;
  content: string;
  mood?: string;
  tags: string[];
  reminder_days: number;
  created_at: string;
}

interface JournalData {
  entries: JournalEntry[];
  summary: { total: number; by_mood: Record<string, number> };
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

export function JournalTab() {
  const [data, setData] = useState<JournalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/api/journal")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: "#888" }}>Loading...</p>;
  if (!data) return <p style={{ color: "#888" }}>No data yet.</p>;

  return (
    <div>
      {/* Mood summary */}
      {Object.keys(data.summary.by_mood).length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          {Object.entries(data.summary.by_mood)
            .sort(([, a], [, b]) => b - a)
            .map(([mood, count]) => {
              const style = MOOD_STYLES[mood] ?? MOOD_STYLES.neutral;
              return (
                <div
                  key={mood}
                  style={{
                    backgroundColor: style.bg,
                    color: style.color,
                    padding: "6px 12px",
                    borderRadius: 20,
                    fontSize: 12,
                  }}
                >
                  {style.emoji} {mood} ({count})
                </div>
              );
            })}
        </div>
      )}

      {/* Entries timeline */}
      {data.entries.length === 0 ? (
        <p style={{ color: "#555" }}>
          No journal entries yet. Try: "today was a productive day"
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {data.entries.map((e) => {
            const moodStyle = e.mood
              ? (MOOD_STYLES[e.mood] ?? MOOD_STYLES.neutral)
              : null;
            return (
              <div
                key={e.id}
                style={{
                  backgroundColor: "#0d0d0d",
                  border: "1px solid #2a2a2a",
                  borderLeft: "3px solid #6366f1",
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <span style={{ fontSize: 16 }}>📓</span>
                    <span style={{ fontSize: 12, color: "#555" }}>
                      {new Date(e.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
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
                      {moodStyle.emoji} {e.mood}
                    </span>
                  )}
                </div>

                <p
                  style={{
                    fontSize: 14,
                    color: "#e5e5e5",
                    lineHeight: 1.6,
                    fontStyle: "italic",
                    marginBottom: 10,
                  }}
                >
                  "{e.content}"
                </p>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", gap: 6 }}>
                    {e.tags.map((tag) => (
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
                  <span style={{ fontSize: 11, color: "#444" }}>
                    🔔 revisit in {e.reminder_days}d
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
