import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeverityBadge } from "@/components/portfolio/SeverityBadge";
import type { PortfolioInsightData } from "@/types/portfolio.types";

export function InsightCard({ insight }: { insight: PortfolioInsightData & { id?: string } }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{insight.title}</CardTitle>
          <SeverityBadge severity={insight.severity} />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{insight.description}</p>
      </CardContent>
    </Card>
  );
}
