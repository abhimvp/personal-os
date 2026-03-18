import { useEffect, useState } from "react";

interface Transaction {
  id: number;
  amount: number;
  currency: string;
  category: string;
  description: string;
  type: string;
  created_at: string;
}

interface FinanceData {
  transactions: Transaction[];
  summary: {
    total_expense: number;
    total_income: number;
    net: number;
    by_category: Record<string, number>;
  };
}

const CATEGORY_EMOJI: Record<string, string> = {
  food: "🍔",
  transport: "🚗",
  shopping: "🛍️",
  bills: "📄",
  health: "💊",
  entertainment: "🎉",
  travel: "✈️",
  other: "💼",
};

export function FinanceTab() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/api/finance")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: "#888" }}>Loading...</p>;
  if (!data) return <p style={{ color: "#888" }}>No data yet.</p>;

  return (
    <div>
      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <SummaryCard
          label="Total Spent"
          value={`₹${data.summary.total_expense.toLocaleString()}`}
          color="#ef4444"
        />
        <SummaryCard
          label="Total Income"
          value={`₹${data.summary.total_income.toLocaleString()}`}
          color="#22c55e"
        />
        <SummaryCard
          label="Net"
          value={`₹${Math.abs(data.summary.net).toLocaleString()}`}
          color={data.summary.net >= 0 ? "#22c55e" : "#ef4444"}
        />
      </div>

      {/* Category breakdown */}
      {Object.keys(data.summary.by_category).length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3
            style={{
              fontSize: 13,
              color: "#888",
              marginBottom: 10,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            By Category
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(data.summary.by_category)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, amount]) => (
                <div
                  key={cat}
                  style={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #333",
                    borderRadius: 8,
                    padding: "8px 12px",
                    fontSize: 13,
                  }}
                >
                  {CATEGORY_EMOJI[cat] ?? "💼"} {cat}
                  <span
                    style={{ color: "#ef4444", marginLeft: 8, fontWeight: 600 }}
                  >
                    ₹{amount.toLocaleString()}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Transactions list */}
      <h3
        style={{
          fontSize: 13,
          color: "#888",
          marginBottom: 10,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        Recent Transactions
      </h3>
      {data.transactions.length === 0 ? (
        <p style={{ color: "#555" }}>
          No transactions yet. Try: "spent 500 on lunch"
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.transactions.map((t) => (
            <div
              key={t.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#111",
                border: "1px solid #222",
                borderRadius: 8,
                padding: "10px 14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>
                  {CATEGORY_EMOJI[t.category] ?? "💼"}
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {t.description}
                  </div>
                  <div style={{ fontSize: 11, color: "#666" }}>
                    {t.category} ·{" "}
                    {new Date(t.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                </div>
              </div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: t.type === "expense" ? "#ef4444" : "#22c55e",
                }}
              >
                {t.type === "expense" ? "-" : "+"}₹{t.amount.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        backgroundColor: "#111",
        border: "1px solid #222",
        borderRadius: 10,
        padding: 16,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#666",
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
