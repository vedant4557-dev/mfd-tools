import { Badge } from "@/components/ui/badge";
import type { InsightSeverity } from "@prisma/client";

const VARIANT_MAP: Record<InsightSeverity, "critical" | "warning" | "secondary" | "outline"> = {
  CRITICAL: "critical",
  HIGH: "warning",
  MEDIUM: "secondary",
  LOW: "outline",
};

export function SeverityBadge({ severity }: { severity: InsightSeverity }) {
  return <Badge variant={VARIANT_MAP[severity]}>{severity}</Badge>;
}
