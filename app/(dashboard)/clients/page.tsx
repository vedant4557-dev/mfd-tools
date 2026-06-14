import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Upload, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Client, CASUpload } from "@prisma/client";

export const metadata = { title: "Clients" };

type ClientWithLatestUpload = Client & {
  casUploads: Pick<CASUpload, "id" | "parsedData" | "parseError" | "createdAt">[];
};

function latestUploadBadge(client: ClientWithLatestUpload) {
  const latest = client.casUploads[0];
  if (!latest) return null;
  if (latest.parseError) return <Badge variant="critical">Failed</Badge>;
  if (latest.parsedData) return <Badge variant="success">Analyzed</Badge>;
  return <Badge variant="secondary">Processing</Badge>;
}

export default async function ClientsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const clients = await prisma.client.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      casUploads: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, parsedData: true, parseError: true, createdAt: true },
      },
    },
  });

  return (
    <>
      <PageHeader
        title="Clients"
        description="Manage your investor clients and their portfolio analysis"
        action={
          <Button asChild>
            <Link href="/clients/new">
              <Plus className="h-4 w-4" />
              Add client
            </Link>
          </Button>
        }
      />

      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <p className="font-medium">No clients yet</p>
            <p className="text-sm text-muted-foreground">
              Add your first client to start uploading CAS statements and generating
              portfolio intelligence.
            </p>
            <Button asChild>
              <Link href="/clients/new">Add your first client</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {clients.map((client: ClientWithLatestUpload) => {
            const latest = client.casUploads[0];
            return (
              <div
                key={client.id}
                className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 hover:bg-accent/30 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{client.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {client.email ?? client.phone ?? client.pan ?? "No contact info"}
                    {client.riskProfile && ` · ${client.riskProfile}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  {latestUploadBadge(client)}
                  {latest?.parsedData ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/portfolio/${latest.id}`}>
                        <BarChart3 className="h-4 w-4" />
                        Analysis
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/generate?clientId=${client.id}`}>
                        <Upload className="h-4 w-4" />
                        Upload CAS
                      </Link>
                    </Button>
                  )}
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/clients/${client.id}`}>View</Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
