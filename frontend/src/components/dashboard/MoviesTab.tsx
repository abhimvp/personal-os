import { useEffect, useState } from "react";

interface Movie {
  id: number;
  title: string;
  status: string;
  progress?: string;
  mood_tags: string[];
  context_tags: string[];
  notes?: string;
  created_at: string;
}

interface MoviesData {
  movies: Movie[];
  summary: { total: number; by_status: Record<string, number> };
}

const STATUS_COLOR: Record<string, string> = {
  watching: "#3b82f6",
  completed: "#22c55e",
  dropped: "#ef4444",
  planned: "#a855f7",
};

const STATUS_EMOJI: Record<string, string> = {
  watching: "▶️",
  completed: "✅",
  dropped: "🚫",
  planned: "📋",
};

export function MoviesTab() {
  const [data, setData] = useState<MoviesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch("http://localhost:8000/api/movies")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: "#888" }}>Loading...</p>;
  if (!data) return <p style={{ color: "#888" }}>No data yet.</p>;

  const filtered =
    filter === "all"
      ? data.movies
      : data.movies.filter((m) => m.status === filter);

  return (
    <div>
      {/* Summary */}
      <div
        style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}
      >
        <FilterChip
          label={`All (${data.summary.total})`}
          value="all"
          active={filter === "all"}
          onClick={setFilter}
        />
        {Object.entries(data.summary.by_status).map(([status, count]) => (
          <FilterChip
            key={status}
            label={`${STATUS_EMOJI[status]} ${status} (${count})`}
            value={status}
            active={filter === status}
            onClick={setFilter}
          />
        ))}
      </div>

      {/* Movie grid */}
      {filtered.length === 0 ? (
        <p style={{ color: "#555" }}>
          No movies yet. Try: "watched Interstellar halfway through"
        </p>
      ) : (
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          {filtered.map((m) => (
            <div
              key={m.id}
              style={{
                backgroundColor: "#111",
                border: "1px solid #222",
                borderRadius: 10,
                padding: 14,
                borderLeft: `3px solid ${STATUS_COLOR[m.status] ?? "#555"}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 8,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  🎬 {m.title}
                </div>
                <span
                  style={{
                    fontSize: 10,
                    backgroundColor: STATUS_COLOR[m.status] ?? "#555",
                    color: "white",
                    padding: "2px 8px",
                    borderRadius: 20,
                    textTransform: "capitalize",
                  }}
                >
                  {m.status}
                </span>
              </div>

              {m.progress && (
                <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>
                  📍 {m.progress}
                </div>
              )}

              {m.mood_tags.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    flexWrap: "wrap",
                    marginBottom: 6,
                  }}
                >
                  {m.mood_tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: 10,
                        backgroundColor: "#1e3a5f",
                        color: "#93c5fd",
                        padding: "2px 6px",
                        borderRadius: 20,
                      }}
                    >
                      🎭 {tag}
                    </span>
                  ))}
                </div>
              )}

              {m.notes && (
                <div
                  style={{ fontSize: 11, color: "#666", fontStyle: "italic" }}
                >
                  "{m.notes}"
                </div>
              )}

              <div style={{ fontSize: 10, color: "#444", marginTop: 8 }}>
                {new Date(m.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: string;
  active: boolean;
  onClick: (v: string) => void;
}) {
  return (
    <button
      onClick={() => onClick(value)}
      style={{
        padding: "6px 12px",
        borderRadius: 20,
        border: "1px solid",
        borderColor: active ? "#6366f1" : "#333",
        backgroundColor: active ? "#1e1b4b" : "#111",
        color: active ? "#a5b4fc" : "#888",
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
