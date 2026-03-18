import { useState, useEffect, useRef } from "react";
import { useStream } from "@langchain/langgraph-sdk/react";
import type { Message } from "@langchain/langgraph-sdk";
import { MovieLogCard } from "./components/ui/MovieLogCard";
import { JournalEntryCard } from "./components/ui/JournalEntryCard";
import { FinanceTab } from "./components/dashboard/FinanceTab";
import { MoviesTab } from "./components/dashboard/MoviesTab";
import { JournalTab } from "./components/dashboard/JournalTab";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgentState {
  messages: Message[];
  ui: unknown[];
  intent: string;
}

interface FinanceInterrupt {
  type: "finance_confirm";
  extracted: {
    amount: number;
    currency: string;
    category: string;
    description: string;
    type: string;
  };
  message: string;
}

interface MovieInterrupt {
  type: "movie_confirm";
  extracted: Record<string, unknown>;
  message: string;
}

type AnyInterrupt = FinanceInterrupt | MovieInterrupt;

interface PendingInterrupt {
  id: string;
  value: AnyInterrupt;
  decision?: "approved" | "rejected";
}

interface Stats {
  finance: { total_expense: number; count: number };
  movies: { total: number; by_status: Record<string, number> };
  journal: { total: number };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return (content as any[])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
  }
  return "";
}

const UI_COMPONENTS: Record<string, React.ComponentType<any>> = {
  movie_log_card: MovieLogCard,
  journal_entry_card: JournalEntryCard,
};

// ── Modal ─────────────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        backgroundColor: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        animation: "fadeIn 0.15s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 680,
          maxHeight: "80vh",
          backgroundColor: "#0f0f0f",
          border: "1px solid #2a2a2a",
          borderRadius: 16,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
          animation: "slideUp 0.2s ease",
        }}
      >
        {/* Modal header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid #1e1e1e",
            background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)",
          }}
        >
          <span
            style={{
              fontWeight: 700,
              fontSize: 16,
              color: "#e5e5e5",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#555",
              cursor: "pointer",
              fontSize: 20,
              lineHeight: 1,
              padding: "2px 6px",
              borderRadius: 6,
              transition: "color 0.15s",
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal body */}
        <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Stat Tile ─────────────────────────────────────────────────────────────────

function StatTile({
  icon,
  label,
  value,
  sub,
  gradient,
  onClick,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  gradient: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        minWidth: 140,
        background: hovered ? gradient.replace("0.15", "0.25") : gradient,
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 14,
        padding: "18px 16px",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.2s ease",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 8px 24px rgba(0,0,0,0.3)"
          : "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 10 }}>{icon}</div>
      <div
        style={{
          fontSize: 11,
          color: "#888",
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: "#e5e5e5",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{sub}</div>
      )}
      <div style={{ fontSize: 11, color: "#444", marginTop: 8 }}>
        tap to view →
      </div>
    </button>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [uiItems, setUiItems] = useState<any[]>([]);
  const [pendingInterrupts, setPendingInterrupts] = useState<
    PendingInterrupt[]
  >([]);
  const [modal, setModal] = useState<"finance" | "movies" | "journal" | null>(
    null,
  );
  const [stats, setStats] = useState<Stats>({
    finance: { total_expense: 0, count: 0 },
    movies: { total: 0, by_status: {} },
    journal: { total: 0 },
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch stats on mount + after each completed interaction
  const fetchStats = () => {
    Promise.all([
      fetch("http://localhost:8000/api/finance").then((r) => r.json()),
      fetch("http://localhost:8000/api/movies").then((r) => r.json()),
      fetch("http://localhost:8000/api/journal").then((r) => r.json()),
    ])
      .then(([finance, movies, journal]) => {
        setStats({
          finance: {
            total_expense: finance.summary?.total_expense ?? 0,
            count: finance.transactions?.length ?? 0,
          },
          movies: {
            total: movies.summary?.total ?? 0,
            by_status: movies.summary?.by_status ?? {},
          },
          journal: { total: journal.summary?.total ?? 0 },
        });
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const stream = useStream<AgentState>({
    apiUrl: "http://localhost:2024",
    assistantId: "personal_os",
    threadId: threadId ?? undefined,
    onThreadId: (id) => setThreadId(id),
    onCustomEvent: (event: any) => {
      if (event?.name && event?.props !== undefined) {
        setUiItems((prev) => {
          const exists = prev.find((u) => u.id === event.id);
          if (exists) return prev;
          return [...prev, event];
        });
      }
    },
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [stream.messages]);

  // Poll for interrupts
  useEffect(() => {
    if (!threadId || stream.isLoading) return;
    fetch(`http://localhost:2024/threads/${threadId}/state`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.next?.length > 0 && data?.tasks?.length > 0) {
          const all: PendingInterrupt[] = data.tasks
            .filter((t: any) => t.interrupts?.length > 0)
            .map((t: any) => ({
              id: t.interrupts[0].id,
              value: t.interrupts[0].value as AnyInterrupt,
            }));
          setPendingInterrupts(all);
        } else {
          setPendingInterrupts([]);
          fetchStats(); // Refresh stats after a completed interaction
        }
      })
      .catch(() => {});
  }, [threadId, stream.isLoading]);

  const handleSend = () => {
    if (!input.trim()) return;
    setUiItems([]);
    setPendingInterrupts([]);
    stream.submit({ messages: [{ type: "human", content: input }] });
    setInput("");
  };

  const handleDecision = async (interruptId: string, approved: boolean) => {
    const updated = pendingInterrupts.map((i) =>
      i.id === interruptId
        ? {
            ...i,
            decision: approved ? ("approved" as const) : ("rejected" as const),
          }
        : i,
    );
    const allDecided = updated.every((i) => i.decision !== undefined);

    if (allDecided) {
      const resumeDict: Record<string, { approved: boolean }> = {};
      updated.forEach((i) => {
        resumeDict[i.id] = { approved: i.decision === "approved" };
      });
      setPendingInterrupts([]);
      try {
        const response = await fetch(
          `http://localhost:2024/threads/${threadId}/runs/stream`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              assistant_id: "personal_os",
              command: { resume: resumeDict },
              stream_mode: ["messages-tuple", "values", "custom"],
            }),
          },
        );
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            decoder.decode(value);
          }
        }
        const cur = threadId;
        setThreadId(null);
        setTimeout(() => setThreadId(cur), 100);
      } catch (e) {
        console.error("Resume failed:", e);
      }
    } else {
      setPendingInterrupts(updated);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Global styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: #080808;
          background-image:
            radial-gradient(ellipse at 20% 20%, rgba(99,102,241,0.06) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.04) 0%, transparent 50%);
          min-height: 100vh;
          color: #e5e5e5;
          font-family: 'DM Sans', sans-serif;
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
      `}</style>

      <div
        style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px 80px" }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))",
              border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: 30,
              padding: "4px 14px",
              marginBottom: 16,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: "#22c55e",
                boxShadow: "0 0 8px #22c55e",
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: 11,
                color: "#a5b4fc",
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              Jarvis Online
            </span>
          </div>
          <h1
            style={{
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: -1,
              background: "linear-gradient(135deg, #e5e5e5 0%, #888 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Personal OS
          </h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>
            Your life, tracked through conversation
          </p>
        </div>

        {/* Stat Tiles */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 28,
            flexWrap: "wrap",
          }}
        >
          <StatTile
            icon="💰"
            label="Finance"
            value={`₹${stats.finance.total_expense.toLocaleString()}`}
            sub={`${stats.finance.count} transactions`}
            gradient="linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%)"
            onClick={() => setModal("finance")}
          />
          <StatTile
            icon="🎬"
            label="Movies"
            value={`${stats.movies.total} logged`}
            sub={
              stats.movies.by_status.watching
                ? `${stats.movies.by_status.watching} watching`
                : "tap to view"
            }
            gradient="linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.05) 100%)"
            onClick={() => setModal("movies")}
          />
          <StatTile
            icon="📓"
            label="Journal"
            value={`${stats.journal.total} entries`}
            sub="tap to reflect"
            gradient="linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0.05) 100%)"
            onClick={() => setModal("journal")}
          />
        </div>

        {/* Chat Interface */}
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
            border: "1px solid #1e1e1e",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
          }}
        >
          {/* Chat header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #1a1a1a",
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg, #111 0%, #0f0f0f 100%)",
            }}
          >
            <span style={{ fontSize: 14 }}>💬</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#888" }}>
              Chat with Jarvis
            </span>
            {stream.isLoading && (
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 11,
                  color: "#6366f1",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ animation: "pulse 1s infinite" }}>●</span>{" "}
                thinking
              </span>
            )}
          </div>

          {/* Messages */}
          <div
            style={{
              minHeight: 200,
              maxHeight: 360,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {stream.messages.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  color: "#333",
                  fontSize: 13,
                  padding: "40px 0",
                }}
              >
                Say something to get started...
              </div>
            )}

            {stream.messages.map((m, i) => (
              <div key={i}>
                {/* Generative UI cards attached to this message */}
                {uiItems
                  .filter(
                    (ui) =>
                      !ui.metadata?.message_id ||
                      ui.metadata?.message_id === m.id,
                  )
                  .map((ui) => {
                    const Component = UI_COMPONENTS[ui.name];
                    return Component ? (
                      <Component key={ui.id} {...ui.props} />
                    ) : null;
                  })}

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      m.type === "human" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "85%",
                      padding: "10px 14px",
                      borderRadius:
                        m.type === "human"
                          ? "16px 16px 4px 16px"
                          : "16px 16px 16px 4px",
                      background:
                        m.type === "human"
                          ? "linear-gradient(135deg, #6366f1, #4f46e5)"
                          : "linear-gradient(135deg, #1a1a1a, #161616)",
                      border: m.type === "human" ? "none" : "1px solid #2a2a2a",
                      fontSize: 14,
                      lineHeight: 1.5,
                      color: m.type === "human" ? "#fff" : "#d4d4d4",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {extractText(m.content)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Interrupt cards */}
          {pendingInterrupts.length > 0 && (
            <div style={{ padding: "0 16px 8px" }}>
              {pendingInterrupts.map((interrupt) => (
                <div
                  key={interrupt.id}
                  style={{
                    border: "1px solid #2a2a2a",
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 8,
                    background: "linear-gradient(135deg, #111, #0f0f0f)",
                    opacity: interrupt.decision ? 0.5 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  {interrupt.decision ? (
                    <p
                      style={{
                        fontSize: 12,
                        color:
                          interrupt.decision === "approved"
                            ? "#22c55e"
                            : "#ef4444",
                      }}
                    >
                      {interrupt.decision === "approved"
                        ? "✅ Approved"
                        : "❌ Cancelled"}{" "}
                      — waiting for others...
                    </p>
                  ) : (
                    <>
                      <p
                        style={{
                          fontSize: 13,
                          color: "#ccc",
                          marginBottom: 10,
                          whiteSpace: "pre-line",
                        }}
                      >
                        {interrupt.value.type === "finance_confirm"
                          ? (interrupt.value as FinanceInterrupt).message
                          : (interrupt.value as MovieInterrupt).message}
                      </p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => handleDecision(interrupt.id, true)}
                          style={{
                            padding: "7px 14px",
                            backgroundColor: "#22c55e",
                            color: "white",
                            border: "none",
                            borderRadius: 8,
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {interrupt.value.type === "finance_confirm"
                            ? "✅ Save it"
                            : "✅ Log it"}
                        </button>
                        <button
                          onClick={() => handleDecision(interrupt.id, false)}
                          style={{
                            padding: "7px 14px",
                            backgroundColor: "transparent",
                            color: "#ef4444",
                            border: "1px solid #ef4444",
                            borderRadius: 8,
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          ❌ Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Input */}
          <div
            style={{
              padding: "12px 16px",
              borderTop: "1px solid #1a1a1a",
              display: "flex",
              gap: 8,
              background: "#0d0d0d",
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && handleSend()
              }
              placeholder="Try: watched Interstellar and spent ₹800 on dinner..."
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #2a2a2a",
                backgroundColor: "#111",
                color: "#e5e5e5",
                fontSize: 13,
                outline: "none",
                fontFamily: "'DM Sans', sans-serif",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
              onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
            />
            <button
              onClick={handleSend}
              disabled={stream.isLoading || !input.trim()}
              style={{
                padding: "10px 18px",
                background:
                  stream.isLoading || !input.trim()
                    ? "#1a1a1a"
                    : "linear-gradient(135deg, #6366f1, #4f46e5)",
                color: stream.isLoading || !input.trim() ? "#444" : "white",
                border: "none",
                borderRadius: 10,
                cursor:
                  stream.isLoading || !input.trim() ? "not-allowed" : "pointer",
                fontSize: 13,
                fontWeight: 600,
                transition: "all 0.2s",
              }}
            >
              Send
            </button>
          </div>
        </div>

        {/* Hint text */}
        <p
          style={{
            textAlign: "center",
            fontSize: 11,
            color: "#333",
            marginTop: 16,
          }}
        >
          Try logging movies, expenses, journal entries — or all three in one
          message
        </p>
      </div>

      {/* Modals */}
      {modal === "finance" && (
        <Modal title="💰 Finance" onClose={() => setModal(null)}>
          <FinanceTab />
        </Modal>
      )}
      {modal === "movies" && (
        <Modal title="🎬 Movies" onClose={() => setModal(null)}>
          <MoviesTab />
        </Modal>
      )}
      {modal === "journal" && (
        <Modal title="📓 Journal" onClose={() => setModal(null)}>
          <JournalTab />
        </Modal>
      )}
    </>
  );
}
