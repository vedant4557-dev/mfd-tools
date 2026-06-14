import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { CASUpload } from "@prisma/client";
import { Upload, BarChart3 } from "lucide-react";

export const metadata = { title: "Client details" };

function statusBadge(upload: Pick<CASUpload, "parsedData" | "parseError">) {
  if (upload.parseError) return <Badge variant="critical">Failed</Badge>;
  if (upload.parsedData) return <Badge variant="success">Analyzed</Badge>;
  return <Badge variant="secondary">Processing</Badge>;
}

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      casUploads: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!client || client.userId !== session.user.id) {
    return (
      <>
        <PageHeader title="Client details" />
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Client not found.
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={client.name}
        description={client.email ?? client.phone ?? "No contact info"}
        action={
          <Button asChild>
            <Link href={`/generate?clientId=${client.id}`}>
              <Upload className="h-4 w-4" />
              Upload CAS
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Portfolio Statements</CardTitle>
        </CardHeader>
        <CardContent>
          {client.casUploads.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No CAS statements uploaded yet. Upload one to get instant portfolio intelligence.
            </p>
          ) : (
            <div className="space-y-2">
              {client.casUploads.map((upload: CASUpload) => (
                <div
                  key={upload.id}
                  className="flex items-center justify-between rounded-md border px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-sm">{upload.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {upload.createdAt.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {statusBadge(upload)}
                    {upload.parsedData ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/portfolio/${upload.id}`}>
                          <BarChart3 className="h-4 w-4" />
                          View Analysis
                        </Link>
                      </Button>
                    ) : upload.parseError ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/generate?clientId=${client.id}`}>Retry</Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
