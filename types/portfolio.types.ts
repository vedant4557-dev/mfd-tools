import type { AssetClass, InsightCategory, InsightSeverity, SIPStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Normalized portfolio data (derived from CASParsedData at upload time)
// ---------------------------------------------------------------------------

export interface NormalizedHolding {
  schemeName: string;
  category: string; // raw category string from CAS, e.g. "Equity - Large Cap"
  assetClass: AssetClass;
  units: number;
  currentValue: number;
  investedValue: number;
  xirr?: number;
  expenseRatio?: number;
}

export interface NormalizedSIP {
  schemeName: string;
  amount: number;
  status: SIPStatus;
  missedCount: number;
  lastDebitDate?: string; // ISO date
}

export interface NormalizedPortfolio {
  clientId: string;
  casUploadId: string;
  totalValue: number;
  totalInvested: number;
  holdings: NormalizedHolding[];
  sips: NormalizedSIP[];
}

// ---------------------------------------------------------------------------
// Analytics module outputs (Phase 1) — all deterministic, no LLM involvement
// ---------------------------------------------------------------------------

export interface ConcentrationRiskResult {
  topHoldingPct: number;
  topHoldingName: string;
  top3Pct: number;
  top3Names: string[];
  riskScore: number; // 0-100, higher = more concentrated/riskier
  riskLevel: "low" | "medium" | "high";
}

export interface AssetAllocationResult {
  equityPct: number;
  debtPct: number;
  hybridPct: number;
  cashPct: number;
  otherPct: number;
}

export interface FundOverlapPair {
  fundA: string;
  fundB: string;
  category: string;
  combinedValue: number;
  combinedPctOfPortfolio: number;
}

export interface FundOverlapResult {
  overlapScore: number; // 0-100, higher = more redundant exposure
  overlappingPairs: FundOverlapPair[];
  categoriesWithMultipleFunds: Array<{ category: string; fundCount: number; combinedPct: number }>;
}

export interface HighExpenseFund {
  schemeName: string;
  category: string;
  expenseRatio: number;
  categoryAverage: number;
  differencePct: number; // expenseRatio - categoryAverage
  annualCostEstimate: number; // currentValue * expenseRatio / 100
}

export interface ExpenseAnalysisResult {
  portfolioWeightedExpenseRatio: number;
  highCostFunds: HighExpenseFund[];
  totalEstimatedAnnualCost: number;
}

export interface SIPHealthResult {
  activeCount: number;
  pausedCount: number;
  missedCount: number;
  stoppedCount: number;
  totalMonthlyAmount: number;
  atRiskSIPs: NormalizedSIP[]; // missedCount >= 1 or status MISSED/PAUSED
}

export interface FundPerformanceEntry {
  schemeName: string;
  category: string;
  fundXirr: number | null;
  categoryBenchmark: number;
  differencePct: number | null; // fundXirr - categoryBenchmark
  status: "outperforming" | "underperforming" | "in-line" | "unknown";
}

export interface PerformanceResult {
  portfolioXirr: number | null;
  blendedBenchmark: number;
  portfolioVsBenchmark: number | null;
  fundLevel: FundPerformanceEntry[];
}

export interface PortfolioAnalyticsResult {
  totalValue: number;
  totalInvested: number;
  concentration: ConcentrationRiskResult;
  allocation: AssetAllocationResult;
  overlap: FundOverlapResult;
  expense: ExpenseAnalysisResult;
  sipHealth: SIPHealthResult;
  performance: PerformanceResult;
}

// ---------------------------------------------------------------------------
// Insight Engine outputs (Phase 2)
// ---------------------------------------------------------------------------

export interface PortfolioInsightData {
  severity: InsightSeverity;
  category: InsightCategory;
  title: string;
  description: string;
  metrics: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Portfolio Analyst page (Phase 3)
// ---------------------------------------------------------------------------

export interface PortfolioScoreBreakdown {
  concentrationScore: number; // out of 25
  allocationScore: number; // out of 20
  overlapScore: number; // out of 15
  expenseScore: number; // out of 15
  sipHealthScore: number; // out of 15
  performanceScore: number; // out of 10
}

export interface PortfolioAnalysisResponse {
  portfolioScore: number; // 0-100
  scoreBreakdown: PortfolioScoreBreakdown;
  analytics: PortfolioAnalyticsResult;
  insights: Array<PortfolioInsightData & { id: string; createdAt: string }>;
  topRisks: Array<PortfolioInsightData & { id: string }>;
  topOpportunities: Array<PortfolioInsightData & { id: string }>;
  aiExplanation: string | null;
  clientId: string;
  casUploadId: string;
}

// ---------------------------------------------------------------------------
// Ask Portfolio Chat (Phase 4)
// ---------------------------------------------------------------------------

export interface PortfolioChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PortfolioChatRequest {
  casUploadId: string;
  messages: PortfolioChatMessage[];
}

export interface PortfolioChatToolCall {
  name: string;
  args: object;
  result: unknown;
}

export interface PortfolioChatResponse {
  reply: string;
  toolCalls: PortfolioChatToolCall[];
}
