import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortfolioScoreBreakdown } from "@/types/portfolio.types";
import { cn } from "@/lib/utils";

const MAX = {
  concentrationScore: 25,
  allocationScore: 20,
  overlapScore: 15,
  expenseScore: 15,
  sipHealthScore: 15,
  performanceScore: 10,
} as const;

const LABELS: Record<keyof PortfolioScoreBreakdown, string> = {
  concentrationScore: "Concentration",
  allocationScore: "Asset Allocation",
  overlapScore: "Fund Overlap",
  expenseScore: "Expense Efficiency",
  sipHealthScore: "SIP Health",
  performanceScore: "Performance",
};

function scoreColor(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

export function PortfolioScoreGauge({
  score,
  breakdown,
}: {
  score: number;
  breakdown: PortfolioScoreBreakdown;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Score</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2 mb-6">
          <span className={cn("text-5xl font-bold tabular-nums", scoreColor(score))}>{score}</span>
          <span className="text-xl text-muted-foreground mb-1">/ 100</span>
        </div>
        <div className="space-y-3">
          {(Object.keys(breakdown) as Array<keyof PortfolioScoreBreakdown>).map((key) => {
            const value = breakdown[key];
            const max = MAX[key];
            const pct = (value / max) * 100;
            return (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{LABELS[key]}</span>
                  <span className="tabular-nums">
                    {value} / {max}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"
                    )}
                    style={{ width: `${Math.max(2, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
