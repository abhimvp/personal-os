import { useState } from "react";
import { useStream } from "@langchain/langgraph-sdk/react";
import type { Message } from "@langchain/langgraph-sdk";

interface AgentState {
  messages: Message[];
  ui: unknown[];
  intent: string;
}

// Shape of the interrupt value from finance_node
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

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");
  }
  return "";
}

export default function App() {
  const [input, setInput] = useState("");

  const stream = useStream<AgentState>({
    apiUrl: "http://localhost:2024",
    assistantId: "personal_os",
  });

  // The current interrupt value (if graph is paused)
  const interrupt = stream.interrupt?.value as FinanceInterrupt | undefined;

  const handleSend = () => {
    if (!input.trim()) return;
    stream.submit({ messages: [{ type: "human", content: input }] });
    setInput("");
  };

  const handleApprove = () => {
    // Resume the graph with approved=true
    stream.submit(null, {
      command: { resume: { approved: true } },
    });
  };

  const handleReject = () => {
    // Resume the graph with approved=false
    stream.submit(null, {
      command: { resume: { approved: false } },
    });
  };

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: "0 auto" }}>
      <h1>Personal OS</h1>

      {/* Message thread */}
      <div style={{ marginBottom: 16 }}>
        {stream.messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <strong>{m.type}:</strong> {extractText(m.content)}
          </div>
        ))}
      </div>

      {/* Human-in-the-loop confirmation card */}
      {interrupt && interrupt.type === "finance_confirm" && (
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
            {interrupt.message}
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

      {/* Loading indicator */}
      {stream.isLoading && <p style={{ color: "#888" }}>Thinking...</p>}

      {/* Input */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Try: I spent 800 on dinner"
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
