import { prisma } from "@/lib/prisma";
import { normalizeCASData } from "@/lib/portfolio/normalize";
import { runPortfolioAnalytics, calculatePortfolioScore } from "@/lib/analytics";
import { generatePortfolioInsights } from "@/lib/portfolio/insight-engine";
import { explainPortfolio } from "@/lib/ai/explain-portfolio";
import type { CASParsedData } from "@/types/cas.types";
import type { PortfolioAnalysisResponse, PortfolioInsightData } from "@/types/portfolio.types";
import type { InsightSeverity } from "@prisma/client";

const SEVERITY_ORDER: Record<InsightSeverity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

/**
 * Full Portfolio Intelligence pipeline for a single CAS upload:
 * 1. Normalize CAS data -> NormalizedPortfolio
 * 2. Persist Holding + SIPRecord rows (replacing any prior rows for this upload)
 * 3. Run deterministic analytics (lib/analytics)
 * 4. Run Insight Engine (deterministic, no LLM)
 * 5. Compute portfolio score (deterministic)
 * 6. Persist PortfolioInsight rows
 * 7. Generate AI explanation (LLM explains only, best-effort)
 * 8. Persist PortfolioAnalysis summary record
 *
 * Idempotent: re-running for the same casUploadId replaces prior derived data.
 */
export async function analyzeAndPersistPortfolio(
  casUploadId: string,
  clientId: string,
  casData: CASParsedData
): Promise<PortfolioAnalysisResponse> {
  const normalized = await normalizeCASData(casData, clientId, casUploadId);

  // --- Persist Holdings (replace existing for this upload) ---
  await prisma.holding.deleteMany({ where: { casUploadId } });
  if (normalized.holdings.length > 0) {
    await prisma.holding.createMany({
      data: normalized.holdings.map((h) => ({
        clientId,
        casUploadId,
        schemeName: h.schemeName,
        category: h.category,
        assetClass: h.assetClass,
        units: h.units,
        currentValue: h.currentValue,
        investedValue: h.investedValue,
        xirr: h.xirr,
        expenseRatio: h.expenseRatio,
      })),
    });
  }

  // --- Persist SIP records (replace existing for this upload) ---
  await prisma.sIPRecord.deleteMany({ where: { casUploadId } });
  if (normalized.sips.length > 0) {
    await prisma.sIPRecord.createMany({
      data: normalized.sips.map((s) => ({
        clientId,
        casUploadId,
        schemeName: s.schemeName,
        amount: s.amount,
        status: s.status,
        missedCount: s.missedCount,
        lastDebitDate: s.lastDebitDate ? new Date(s.lastDebitDate) : null,
      })),
    });
  }

  // --- Run deterministic analytics + insight engine ---
  const analytics = runPortfolioAnalytics(normalized);
  const insightData = generatePortfolioInsights(analytics);
  const { total: portfolioScore, breakdown: scoreBreakdown } = calculatePortfolioScore(analytics);

  // --- Persist insights (replace existing for this upload) ---
  await prisma.portfolioInsight.deleteMany({ where: { casUploadId } });
  let createdInsights: Array<PortfolioInsightData & { id: string; createdAt: string }> = [];
  if (insightData.length > 0) {
    await prisma.portfolioInsight.createMany({
      data: insightData.map((i) => ({
        clientId,
        casUploadId,
        severity: i.severity,
        category: i.category,
        title: i.title,
        description: i.description,
        metrics: i.metrics as object,
      })),
    });

    const rows = await prisma.portfolioInsight.findMany({
      where: { casUploadId },
      orderBy: { createdAt: "asc" },
    });
    createdInsights = rows.map((r: typeof rows[number]) => ({
      id: r.id,
      severity: r.severity,
      category: r.category,
      title: r.title,
      description: r.description,
      metrics: r.metrics as Record<string, unknown>,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  // --- Derive top risks / opportunities ---
  const sorted = [...createdInsights].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );
  // "Risks" = concentration, overlap, high expense, performance underperformance, sip health
  // "Opportunities" = framed from the same insight categories but represent actionable items
  // V0 heuristic: all insights are risks/issues to discuss; top 3 by severity = topRisks.
  // Opportunities (V0): expense reduction & SIP health items reframed as actionable opportunities.
  const topRisks = sorted.slice(0, 3).map(({ id, ...rest }) => ({ id, ...rest }));

  const opportunityCategories = new Set(["HIGH_EXPENSE", "SIP_HEALTH", "ASSET_ALLOCATION"]);
  const topOpportunities = sorted
    .filter((i) => opportunityCategories.has(i.category))
    .slice(0, 3)
    .map(({ id, ...rest }) => ({ id, ...rest }));

  // --- AI explanation (best-effort) ---
  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
  const aiExplanation = await explainPortfolio({
    client,
    analytics,
    portfolioScore,
    topRisks,
    topOpportunities,
  });

  // --- Persist analysis summary ---
  const summaryPayload = { analytics, scoreBreakdown };
  await prisma.portfolioAnalysis.upsert({
    where: { casUploadId },
    create: {
      clientId,
      casUploadId,
      portfolioScore,
      summary: summaryPayload as object,
      aiExplanation,
    },
    update: {
      portfolioScore,
      summary: summaryPayload as object,
      aiExplanation,
    },
  });

  return {
    portfolioScore,
    scoreBreakdown,
    analytics,
    insights: createdInsights,
    topRisks,
    topOpportunities,
    aiExplanation,
    clientId,
    casUploadId,
  };
}

/**
 * Loads a previously computed PortfolioAnalysisResponse without re-running
 * analytics — used by GET endpoints and the Ask Portfolio chat tool layer.
 */
export async function loadPortfolioAnalysis(
  casUploadId: string
): Promise<PortfolioAnalysisResponse | null> {
  const analysis = await prisma.portfolioAnalysis.findUnique({ where: { casUploadId } });
  if (!analysis) return null;

  const insightRows = await prisma.portfolioInsight.findMany({
    where: { casUploadId },
    orderBy: { createdAt: "asc" },
  });

  const insights = insightRows.map((r: typeof insightRows[number]) => ({
    id: r.id,
    severity: r.severity,
    category: r.category,
    title: r.title,
    description: r.description,
    metrics: r.metrics as Record<string, unknown>,
    createdAt: r.createdAt.toISOString(),
  }));

  const sorted = [...insights].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );
  const topRisks = sorted.slice(0, 3).map(({ id, ...rest }) => ({ id, ...rest }));
  const opportunityCategories = new Set(["HIGH_EXPENSE", "SIP_HEALTH", "ASSET_ALLOCATION"]);
  const topOpportunities = sorted
    .filter((i) => opportunityCategories.has(i.category))
    .slice(0, 3)
    .map(({ id, ...rest }) => ({ id, ...rest }));

  const summary = analysis.summary as unknown as {
    analytics: PortfolioAnalysisResponse["analytics"];
    scoreBreakdown: PortfolioAnalysisResponse["scoreBreakdown"];
  };

  return {
    portfolioScore: analysis.portfolioScore,
    scoreBreakdown: summary.scoreBreakdown,
    analytics: summary.analytics,
    insights,
    topRisks,
    topOpportunities,
    aiExplanation: analysis.aiExplanation,
    clientId: analysis.clientId,
    casUploadId: analysis.casUploadId,
  };
}
