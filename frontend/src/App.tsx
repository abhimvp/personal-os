import { useStream } from "@langchain/langgraph-sdk/react";

export default function App() {
  const stream = useStream({
    apiUrl: "http://localhost:2024",
    assistantId: "personal_os",
  });

  return (
    <div style={{ padding: 24 }}>
      <h1>Personal OS</h1>
      <button
        onClick={() =>
          stream.submit({
            messages: [{ type: "human", content: "hello" }],
          })
        }
      >
        Send Test Message
      </button>
      {stream.isLoading && <p>Loading...</p>}
      {stream.messages.map((m, i) => (
        <p key={i}>
          {m.type}: {m.content as string}
        </p>
      ))}
    </div>
  );
}
