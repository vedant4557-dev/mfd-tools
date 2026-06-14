import { GoogleGenerativeAI } from "@google/generative-ai";
import type { PortfolioAnalyticsResult, PortfolioInsightData } from "@/types/portfolio.types";
import type { Client } from "@prisma/client";

function formatIndian(n: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

export interface ExplainPortfolioInput {
  client: Client;
  analytics: PortfolioAnalyticsResult;
  portfolioScore: number;
  topRisks: PortfolioInsightData[];
  topOpportunities: PortfolioInsightData[];
}

/**
 * Builds the prompt for the AI explanation. The prompt explicitly forbids
 * the model from introducing any numbers not present in the provided data —
 * its job is prioritization framing and plain-English explanation only.
 */
export function buildExplanationPrompt(input: ExplainPortfolioInput): string {
  const { client, analytics, portfolioScore, topRisks, topOpportunities } = input;

  return `
You are a senior portfolio analyst writing a short briefing for a Mutual Fund Distributor (MFD) in India, ahead of a client review meeting.

STRICT RULES:
- Use ONLY the numbers provided below. Do NOT calculate, estimate, or invent any new figures.
- Do NOT mention specific percentages or amounts beyond what is given.
- Write 3-5 short sentences in plain English, professional but conversational tone.
- Focus on what matters MOST for this client right now — prioritize the most severe/impactful items.
- Do not give specific buy/sell investment advice; frame items as "worth discussing with the client" or "worth reviewing".

CLIENT: ${client.name} | Risk profile: ${client.riskProfile ?? "Not specified"}
PORTFOLIO VALUE: ₹${formatIndian(analytics.totalValue)}
PORTFOLIO SCORE: ${portfolioScore}/100

TOP RISKS (already computed, do not recalculate):
${topRisks.map((r, i) => `${i + 1}. [${r.severity}] ${r.title} — ${r.description}`).join("\n") || "None identified."}

TOP OPPORTUNITIES (already computed, do not recalculate):
${topOpportunities.map((o, i) => `${i + 1}. [${o.severity}] ${o.title} — ${o.description}`).join("\n") || "None identified."}

Write the briefing now. Output plain text only, no markdown, no JSON.
`.trim();
}

/**
 * Calls Gemini to generate a short natural-language explanation of the
 * already-computed portfolio insights. If the API call fails, returns null
 * so the UI can fall back to showing the structured insights without
 * an AI summary (graceful degradation — analytics/insights are never
 * blocked by LLM availability).
 */
export async function explainPortfolio(input: ExplainPortfolioInput): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(buildExplanationPrompt(input));
    const text = result.response.text().trim();
    return text || null;
  } catch (err) {
    console.error(JSON.stringify({ event: "explain_portfolio_error", error: String(err) }));
    return null;
  }
}
