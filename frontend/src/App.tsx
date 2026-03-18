import { useState, useEffect } from "react";
import { useStream } from "@langchain/langgraph-sdk/react";
import type { Message } from "@langchain/langgraph-sdk";
import { MovieLogCard } from "./components/ui/MovieLogCard";

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
};

export default function App() {
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [uiItems, setUiItems] = useState<any[]>([]);
  const [pendingInterrupt, setPendingInterrupt] = useState<AnyInterrupt | null>(
    null,
  );

  const stream = useStream<AgentState>({
    apiUrl: "http://localhost:2024",
    assistantId: "personal_os",
    threadId: threadId ?? undefined,
    onThreadId: (id) => setThreadId(id),
    // removed reconnectOnMount — it was auto-resuming the interrupt
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

  // Poll thread state to detect interrupt after run completes
  useEffect(() => {
    if (!threadId || stream.isLoading) return;

    fetch(`http://localhost:2024/threads/${threadId}/state`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.next?.length > 0 && data?.tasks?.[0]?.interrupts?.[0]) {
          setPendingInterrupt(
            data.tasks[0].interrupts[0].value as AnyInterrupt,
          );
        } else {
          setPendingInterrupt(null);
        }
      })
      .catch(() => {});
  }, [threadId, stream.isLoading]);

  const handleSend = () => {
    if (!input.trim()) return;
    setUiItems([]);
    setPendingInterrupt(null);
    stream.submit({ messages: [{ type: "human", content: input }] });
    setInput("");
  };

  const handleApprove = () => {
    setPendingInterrupt(null);
    stream.submit(null, { command: { resume: { approved: true } } });
  };

  const handleReject = () => {
    setPendingInterrupt(null);
    stream.submit(null, { command: { resume: { approved: false } } });
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

      {/* Finance confirmation */}
      {pendingInterrupt?.type === "finance_confirm" && (
        <div
          style={{
            border: "1px solid #444",
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
            backgroundColor: "#1a1a1a",
          }}
        >
          <p style={{ whiteSpace: "pre-line", marginBottom: 12 }}>
            {(pendingInterrupt as FinanceInterrupt).message}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleApprove}
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
              onClick={handleReject}
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
        </div>
      )}

      {/* Movie confirmation */}
      {pendingInterrupt?.type === "movie_confirm" && (
        <div
          style={{
            border: "1px solid #444",
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
            backgroundColor: "#1a1a1a",
          }}
        >
          <p style={{ marginBottom: 12 }}>
            {(pendingInterrupt as MovieInterrupt).message}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleApprove}
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
              onClick={handleReject}
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
        </div>
      )}

      {stream.isLoading && <p style={{ color: "#888" }}>Thinking...</p>}

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Try: watched Interstellar halfway through"
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
