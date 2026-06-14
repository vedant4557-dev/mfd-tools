import { GoogleGenerativeAI } from "@google/generative-ai";
import type { CASParsedData } from "@/types/cas.types";
import type { DeckNarrative } from "@/types/deck.types";
import type { Brand, Client } from "@prisma/client";

function formatIndian(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

export interface DeckNarrativeInput {
  casData: CASParsedData;
  client: Client;
  brand: Brand | null;
}

export const DECK_NARRATIVE_PROMPT = (data: DeckNarrativeInput) => `
You are a senior financial advisor writing a quarterly portfolio review for an Indian mutual fund investor.
Write in a professional, warm, and easy-to-understand tone. Use Indian number formatting (lakhs, crores). All amounts in INR.

CLIENT: ${data.client.name} | Risk: ${data.client.riskProfile ?? "Not specified"}
PORTFOLIO: ₹${formatIndian(data.casData.totalValue)} | XIRR: ${data.casData.xirr?.toFixed(2) ?? "N/A"}%
FUNDS: ${data.casData.funds.length}

Return raw JSON only with keys: portfolioSummary, keyHighlights, fundCommentaries, allocationInsight, recommendedActions, closingNote.
`;

export async function generateDeckNarrative(
  input: DeckNarrativeInput
): Promise<DeckNarrative> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContent(DECK_NARRATIVE_PROMPT(input));
  const text = result.response.text();
  return JSON.parse(text) as DeckNarrative;
}
