export async function getAIPrediction(symbol, points, stats) {
  const recent = points.slice(-30);
  const history = recent
    .map((p) => `${p.time}: $${p.close.toFixed(2)}`)
    .join("\n");

  const prompt = `You are a quantitative stock analyst. Below is today's intraday 5-minute price data for ${symbol}.

${history}

Current price: $${stats.price.toFixed(2)}
Today's open: $${stats.open?.toFixed(2) ?? "N/A"}
Day high: $${stats.high?.toFixed(2) ?? "N/A"}
Day low: $${stats.low?.toFixed(2) ?? "N/A"}
Change vs prev close: ${stats.change >= 0 ? "+" : ""}${stats.change.toFixed(2)} (${stats.changePct.toFixed(2)}%)

Analyze price momentum, trend direction, support/resistance, and volume context.
Give short-term predictions for 3 time horizons.

Respond ONLY with a valid JSON object in exactly this structure (no markdown, no explanation outside JSON):
{
  "5m":  { "signal": "bullish"|"bearish"|"neutral", "target": "$X.XX-$Y.YY", "reasoning": "One concise sentence." },
  "30m": { "signal": "bullish"|"bearish"|"neutral", "target": "$X.XX-$Y.YY", "reasoning": "One concise sentence." },
  "1h":  { "signal": "bullish"|"bearish"|"neutral", "target": "$X.XX-$Y.YY", "reasoning": "One concise sentence." }
}`;

  // x-api-key is injected by the Vite proxy from .env — never sent from the browser
  const res = await fetch("/api/anthropic/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  const raw = data.content?.find((b) => b.type === "text")?.text || "";
  const clean = raw.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(clean);
  } catch {
    throw new Error("AI returned invalid JSON — please try again");
  }
}
