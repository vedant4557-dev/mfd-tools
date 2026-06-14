import { GoogleGenerativeAI, SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { loadPortfolioAnalysis } from "@/lib/portfolio/analyze";
import type {
  PortfolioChatMessage,
  PortfolioChatResponse,
  PortfolioChatToolCall,
} from "@/types/portfolio.types";

const MAX_TOOL_ROUNDS = 4;

// ---------------------------------------------------------------------------
// Tool definitions — every tool reads ONLY persisted portfolio data for the
// given casUploadId. No tool calls external models or fabricates data.
// ---------------------------------------------------------------------------

const TOOLS: FunctionDeclaration[] = [
  {
    name: "get_portfolio_summary",
    description:
      "Get the overall portfolio score, score breakdown, total value, asset allocation, and performance vs benchmark.",
    parameters: { type: SchemaType.OBJECT, properties: {} },
  },
  {
    name: "get_insights",
    description:
      "Get the list of structured insights (risks and opportunities) detected for this portfolio, optionally filtered by category.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        category: {
          type: SchemaType.STRING,
          description:
            "Optional filter: CONCENTRATION_RISK, ASSET_ALLOCATION, FUND_OVERLAP, HIGH_EXPENSE, SIP_HEALTH, or PERFORMANCE",
        },
      },
    },
  },
  {
    name: "get_holdings",
    description:
      "Get the list of individual fund holdings with their values, categories, XIRR, and expense ratios.",
    parameters: { type: SchemaType.OBJECT, properties: {} },
  },
  {
    name: "get_fund_overlap_detail",
    description:
      "Get detailed fund overlap pairs — which specific funds overlap with each other and by how much.",
    parameters: { type: SchemaType.OBJECT, properties: {} },
  },
  {
    name: "get_sip_status",
    description: "Get SIP health details — active, paused, missed, stopped SIPs for this client.",
    parameters: { type: SchemaType.OBJECT, properties: {} },
  },
];

// ---------------------------------------------------------------------------
// Tool execution — reads from the persisted PortfolioAnalysisResponse +
// Holding/SIPRecord tables. No calculation happens here.
// ---------------------------------------------------------------------------

async function executeTool(
  name: string,
  args: object,
  casUploadId: string
): Promise<unknown> {
  const a = args as Record<string, unknown>;
  const analysis = await loadPortfolioAnalysis(casUploadId);
  if (!analysis) return { error: "No analysis found for this portfolio." };

  switch (name) {
    case "get_portfolio_summary":
      return {
        portfolioScore: analysis.portfolioScore,
        scoreBreakdown: analysis.scoreBreakdown,
        totalValue: analysis.analytics.totalValue,
        allocation: analysis.analytics.allocation,
        performance: analysis.analytics.performance,
      };

    case "get_insights": {
      const category = a.category as string | undefined;
      const insights = category
        ? analysis.insights.filter((i) => i.category === category)
        : analysis.insights;
      return { insights };
    }

    case "get_holdings": {
      const holdings = await prisma.holding.findMany({ where: { casUploadId } });
      return {
        holdings: holdings.map((h: typeof holdings[number]) => ({
          schemeName: h.schemeName,
          category: h.category,
          assetClass: h.assetClass,
          currentValue: h.currentValue,
          investedValue: h.investedValue,
          xirr: h.xirr,
          expenseRatio: h.expenseRatio,
        })),
      };
    }

    case "get_fund_overlap_detail":
      return {
        overlapScore: analysis.analytics.overlap.overlapScore,
        overlappingPairs: analysis.analytics.overlap.overlappingPairs,
        categoriesWithMultipleFunds: analysis.analytics.overlap.categoriesWithMultipleFunds,
      };

    case "get_sip_status": {
      const sips = await prisma.sIPRecord.findMany({ where: { casUploadId } });
      return {
        summary: analysis.analytics.sipHealth,
        sips: sips.map((s: typeof sips[number]) => ({
          schemeName: s.schemeName,
          amount: s.amount,
          status: s.status,
          missedCount: s.missedCount,
          lastDebitDate: s.lastDebitDate,
        })),
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

const SYSTEM_INSTRUCTION = `
You are "Ask Portfolio", an AI assistant for Mutual Fund Distributors (MFDs) in India.
You answer questions about ONE specific client's portfolio.

CRITICAL RULES:
- You MUST use the provided tools to retrieve any portfolio data before answering.
- NEVER answer using your own memory/knowledge of fund names, NAVs, returns, or market data.
- If the tools don't return information needed to answer, say so honestly — do not guess.
- All numbers in your answer must come directly from tool results. Do not perform new calculations beyond simple comparisons/sums of numbers already returned by tools.
- Keep answers concise (3-6 sentences) and in plain English suitable for an MFD to relay to a client or use as meeting prep.
- Do not give specific buy/sell recommendations; frame things as "worth discussing" or "worth reviewing with the client".
`.trim();

/**
 * Runs the Ask Portfolio chat agent. Uses Gemini function-calling restricted
 * to the TOOLS above, which read only persisted, pre-computed portfolio data.
 */
export async function runPortfolioChat(
  casUploadId: string,
  messages: PortfolioChatMessage[]
): Promise<PortfolioChatResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      reply:
        "AI chat is not configured (missing GEMINI_API_KEY). Please contact support.",
      toolCalls: [],
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
    tools: [{ functionDeclarations: TOOLS }],
  });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "user") {
    return { reply: "No user message provided.", toolCalls: [] };
  }

  const chat = model.startChat({ history });
  const toolCalls: PortfolioChatToolCall[] = [];

  let result = await chat.sendMessage(lastMessage.content);

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const calls = result.response.functionCalls();
    if (!calls || calls.length === 0) break;

    const responses = [];
    for (const call of calls) {
      const toolResult = await executeTool(call.name, call.args ?? {}, casUploadId);
      toolCalls.push({ name: call.name, args: call.args ?? {}, result: toolResult });
      responses.push({
        functionResponse: { name: call.name, response: toolResult as object },
      });
    }

    result = await chat.sendMessage(responses);
  }

  const reply = result.response.text().trim();
  return { reply, toolCalls };
}
