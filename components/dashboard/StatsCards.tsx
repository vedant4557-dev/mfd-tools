import { Users, FileText, IndianRupee, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getDashboardStats(userId: string) {
  const [clientCount, analysisRows, recentInsights] = await Promise.all([
    prisma.client.count({ where: { userId } }),

    prisma.portfolioAnalysis.findMany({
      where: { client: { userId } },
      select: { summary: true },
    }),

    prisma.portfolioInsight.count({
      where: {
        severity: { in: ["HIGH", "CRITICAL"] },
        client: { userId },
      },
    }),
  ]);

  // Sum totalValue across all latest analyses
  const totalAUM = analysisRows.reduce((sum: number, row: { summary: unknown }) => {
    const summary = row.summary as { analytics?: { totalValue?: number } } | null;
    return sum + (summary?.analytics?.totalValue ?? 0);
  }, 0);

  return { clientCount, totalAUM, analyzedPortfolios: analysisRows.length, recentInsights };
}

function formatINR(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export async function StatsCards() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { clientCount, totalAUM, analyzedPortfolios, recentInsights } =
    await getDashboardStats(session.user.id);

  const stats = [
    {
      title: "Clients",
      value: clientCount.toString(),
      description: "Active client profiles",
      icon: Users,
    },
    {
      title: "Portfolios analyzed",
      value: analyzedPortfolios.toString(),
      description: "CAS statements processed",
      icon: FileText,
    },
    {
      title: "AUM tracked",
      value: totalAUM > 0 ? formatINR(totalAUM) : "—",
      description: "Total value from latest CAS",
      icon: IndianRupee,
    },
    {
      title: "Open risks",
      value: recentInsights.toString(),
      description: "High/critical insights across all clients",
      icon: TrendingUp,
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(({ title, value, description, icon: Icon }) => (
        <Card key={title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
