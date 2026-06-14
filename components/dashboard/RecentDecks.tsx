import Link from "next/link";
import { FileText, BarChart3, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function scoreColor(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

export async function RecentDecks() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const recentAnalyses = await prisma.portfolioAnalysis.findMany({
    where: { client: { userId: session.user.id } },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: {
      client: { select: { id: true, name: true, riskProfile: true } },
      casUpload: { select: { id: true, fileName: true } },
    },
  });

  const hasAny = recentAnalyses.length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Recent portfolio analyses</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link href="/clients">All clients</Link>
        </Button>
      </CardHeader>

      {!hasAny ? (
        <CardContent className="flex flex-col items-center py-12 text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </span>
          <p className="font-medium">No analyses yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Add a client and upload their CAS statement to get instant portfolio intelligence.
          </p>
          <Button className="mt-4" asChild>
            <Link href="/clients/new">Add first client</Link>
          </Button>
        </CardContent>
      ) : (
        <CardContent className="p-0">
          <div className="divide-y">
            {recentAnalyses.map((analysis: typeof recentAnalyses[number]) => (
              <div
                key={analysis.id}
                className="flex items-center justify-between px-6 py-3 hover:bg-accent/30 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{analysis.client.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {analysis.casUpload.fileName} ·{" "}
                    {analysis.createdAt.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  <span className={`text-lg font-bold tabular-nums ${scoreColor(analysis.portfolioScore)}`}>
                    {analysis.portfolioScore}
                    <span className="text-xs font-normal text-muted-foreground">/100</span>
                  </span>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/portfolio/${analysis.casUploadId}`}>
                      <BarChart3 className="h-4 w-4" />
                      View
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t px-6 py-3">
            <Button asChild size="sm" variant="ghost" className="text-muted-foreground">
              <Link href="/generate">
                <Upload className="h-4 w-4" />
                Upload new CAS
              </Link>
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
