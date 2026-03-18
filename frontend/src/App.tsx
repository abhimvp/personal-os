import { useState, useEffect } from "react";
import { useStream } from "@langchain/langgraph-sdk/react";
import type { Message } from "@langchain/langgraph-sdk";
import { MovieLogCard } from "./components/ui/MovieLogCard";
import { JournalEntryCard } from "./components/ui/JournalEntryCard";

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

// Each interrupt now has an ID from LangGraph
interface PendingInterrupt {
  id: string;
  value: AnyInterrupt;
  decision?: "approved" | "rejected"; // tracks what user decided before submitting
}

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

export default function App() {
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [uiItems, setUiItems] = useState<any[]>([]);
  const [pendingInterrupts, setPendingInterrupts] = useState<
    PendingInterrupt[]
  >([]);

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

  // Poll thread state and capture interrupt IDs
  useEffect(() => {
    if (!threadId || stream.isLoading) return;

    fetch(`http://localhost:2024/threads/${threadId}/state`)
      .then((r) => r.json())
      .then((data) => {
        // console.log(
        //   "Thread state tasks:",
        //   JSON.stringify(data?.tasks, null, 2),
        // );
        if (data?.next?.length > 0 && data?.tasks?.length > 0) {
          const allInterrupts: PendingInterrupt[] = data.tasks
            .filter((t: any) => t.interrupts?.length > 0)
            .map((t: any) => ({
              id: t.interrupts[0].id,
              value: t.interrupts[0].value as AnyInterrupt,
            }));
          setPendingInterrupts(allInterrupts);
        } else {
          setPendingInterrupts([]);
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
      // Build a DICT not an array — this is what LangGraph expects
      const resumeDict: Record<string, { approved: boolean }> = {};
      updated.forEach((i) => {
        resumeDict[i.id] = { approved: i.decision === "approved" };
      });

      // console.log("Resume dict:", JSON.stringify(resumeDict, null, 2));

      setPendingInterrupts([]);

      try {
        const response = await fetch(
          `http://localhost:2024/threads/${threadId}/runs/stream`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              assistant_id: "personal_os",
              command: { resume: resumeDict }, // ← dict, not array
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
            const chunk = decoder.decode(value);
            console.log("Resume chunk:", chunk.slice(0, 150));
          }
        }

        // Reload thread by briefly clearing threadId
        const currentThreadId = threadId;
        setThreadId(null);
        setTimeout(() => setThreadId(currentThreadId), 100);
      } catch (e) {
        console.error("Resume failed:", e);
      }
    } else {
      setPendingInterrupts(updated);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 640, margin: "0 auto" }}>
      <h1>Personal OS</h1>

      {/* Message thread */}
      <div style={{ marginBottom: 16 }}>
        {stream.messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <strong>{m.type}:</strong> {extractText(m.content)}
          </div>
        ))}
      </div>

      {/* Generative UI cards */}
      {uiItems.map((ui) => {
        const Component = UI_COMPONENTS[ui.name];
        return Component ? <Component key={ui.id} {...ui.props} /> : null;
      })}

      {/* All pending interrupts — each with its own approve/reject */}
      {pendingInterrupts.map((interrupt) => (
        <div
          key={interrupt.id}
          style={{
            border: `1px solid ${interrupt.decision ? "#555" : "#444"}`,
            borderRadius: 8,
            padding: 16,
            marginBottom: 12,
            backgroundColor: interrupt.decision ? "#111" : "#1a1a1a",
            opacity: interrupt.decision ? 0.6 : 1,
          }}
        >
          {/* Show decided state */}
          {interrupt.decision && (
            <p
              style={{
                color:
                  interrupt.decision === "approved" ? "#22c55e" : "#ef4444",
                marginBottom: 8,
                fontSize: 13,
              }}
            >
              {interrupt.decision === "approved"
                ? "✅ Approved — waiting for other confirmations..."
                : "❌ Cancelled — waiting for other confirmations..."}
            </p>
          )}

          {/* Finance interrupt */}
          {interrupt.value.type === "finance_confirm" &&
            !interrupt.decision && (
              <>
                <p style={{ whiteSpace: "pre-line", marginBottom: 12 }}>
                  {(interrupt.value as FinanceInterrupt).message}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => handleDecision(interrupt.id, true)}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#22c55e",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    ✅ Save it
                  </button>
                  <button
                    onClick={() => handleDecision(interrupt.id, false)}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#ef4444",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    ❌ Cancel
                  </button>
                </div>
              </>
            )}

          {/* Movie interrupt */}
          {interrupt.value.type === "movie_confirm" && !interrupt.decision && (
            <>
              <p style={{ marginBottom: 12 }}>
                {(interrupt.value as MovieInterrupt).message}
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => handleDecision(interrupt.id, true)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#22c55e",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  ✅ Log it
                </button>
                <button
                  onClick={() => handleDecision(interrupt.id, false)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  ❌ Cancel
                </button>
              </div>
            </>
          )}
        </div>
      ))}

      {stream.isLoading && <p style={{ color: "#888" }}>Thinking...</p>}

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Try: watched Interstellar and spent 800 on dinner"
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #444",
            backgroundColor: "#111",
            color: "white",
          }}
        />
        <button
          onClick={handleSend}
          disabled={stream.isLoading}
          style={{
            padding: "8px 16px",
            backgroundColor: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
