"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PortfolioScoreGauge } from "@/components/portfolio/PortfolioScoreGauge";
import { InsightCard } from "@/components/portfolio/InsightCard";
import { AskPortfolioChat } from "@/components/portfolio/AskPortfolioChat";
import type { PortfolioAnalysisResponse } from "@/types/portfolio.types";

function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function PortfolioAnalystPage({
  params,
}: {
  params: { casUploadId: string };
}) {
  const { casUploadId } = params;
  const [data, setData] = useState<PortfolioAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/portfolio/${casUploadId}`);
      if (res.status === 404) {
        setData(null);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analysis");
    } finally {
      setLoading(false);
    }
  }, [casUploadId]);

  const runAnalysis = useCallback(async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/portfolio/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ casUploadId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze portfolio");
    } finally {
      setAnalyzing(false);
    }
  }, [casUploadId]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  if (loading) {
    return (
      <>
        <PageHeader title="Portfolio Analyst" description="Loading…" />
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Loading analysis…</CardContent>
        </Card>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <PageHeader title="Portfolio Analyst" description="AI-powered portfolio intelligence" />
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-muted-foreground">
              No analysis has been run for this portfolio yet.
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={runAnalysis} disabled={analyzing}>
              {analyzing ? "Analyzing…" : "Run Portfolio Analysis"}
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  const { analytics } = data;

  return (
    <>
      <PageHeader
        title="Portfolio Analyst"
        description={`Total value: ${formatINR(analytics.totalValue)}`}
        action={
          <Button onClick={runAnalysis} variant="outline" disabled={analyzing}>
            {analyzing ? "Re-analyzing…" : "Re-run Analysis"}
          </Button>
        }
      />

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-1">
          <PortfolioScoreGauge score={data.portfolioScore} breakdown={data.scoreBreakdown} />
        </div>

        <div className="lg:col-span-2 space-y-6">
          {data.aiExplanation && (
            <Card>
              <CardHeader>
                <CardTitle>What matters most</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-line">{data.aiExplanation}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Quick stats</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <Stat label="Equity" value={`${analytics.allocation.equityPct}%`} />
              <Stat label="Debt" value={`${analytics.allocation.debtPct}%`} />
              <Stat label="Hybrid" value={`${analytics.allocation.hybridPct}%`} />
              <Stat label="Cash" value={`${analytics.allocation.cashPct}%`} />
              <Stat
                label="Portfolio XIRR"
                value={analytics.performance.portfolioXirr !== null ? `${analytics.performance.portfolioXirr}%` : "N/A"}
              />
              <Stat label="Benchmark" value={`${analytics.performance.blendedBenchmark}%`} />
              <Stat label="Weighted Expense" value={`${analytics.expense.portfolioWeightedExpenseRatio}%`} />
              <Stat label="Active SIPs" value={`${analytics.sipHealth.activeCount}`} />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            Top Risks
            <Badge variant="outline">{data.topRisks.length}</Badge>
          </h2>
          <div className="space-y-3">
            {data.topRisks.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  No significant risks detected.
                </CardContent>
              </Card>
            ) : (
              data.topRisks.map((r) => <InsightCard key={r.id} insight={r} />)
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            Top Opportunities
            <Badge variant="outline">{data.topOpportunities.length}</Badge>
          </h2>
          <div className="space-y-3">
            {data.topOpportunities.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  No specific opportunities flagged.
                </CardContent>
              </Card>
            ) : (
              data.topOpportunities.map((o) => <InsightCard key={o.id} insight={o} />)
            )}
          </div>
        </section>
      </div>

      {data.insights.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">All Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.insights.map((i) => (
              <InsightCard key={i.id} insight={i} />
            ))}
          </div>
        </section>
      )}

      <section>
        <AskPortfolioChat casUploadId={casUploadId} />
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
