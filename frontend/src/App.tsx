import { useStream } from "@langchain/langgraph-sdk/react";
import type { Message } from "@langchain/langgraph-sdk";

// Mirrors AgentState from Python exactly
interface AgentState {
  messages: Message[];
  ui: unknown[];
  intent: string;
}

export default function App() {
  const stream = useStream<AgentState>({
    apiUrl: "http://localhost:2024",
    assistantId: "personal_os",
  });

  return (
    <div style={{ padding: 24 }}>
      <h1>Personal OS</h1>
      <button
        onClick={() =>
          stream.submit({
            messages: [{ type: "human", content: "hello, who are you?" }],
          })
        }
      >
        Send Test Message
      </button>

      {stream.isLoading && <p>Thinking...</p>}
      {stream.error && <p>Error: {stream.error.message}</p>}

      {stream.messages.map((m, i) => {
        // Extract text content regardless of whether it's a string or Gemini block array
        const content = Array.isArray(m.content)
          ? m.content
              .filter((b: any) => b.type === "text")
              .map((b: any) => b.text)
              .join("")
          : (m.content as string);

        return (
          <p key={i}>
            <strong>{m.type}:</strong> {content}
          </p>
        );
      })}
    </div>
  );
}
