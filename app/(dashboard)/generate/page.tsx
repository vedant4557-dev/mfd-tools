import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CASUploader } from "@/components/generate/CASUploader";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const metadata = { title: "Upload CAS" };

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: { clientId?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const clientId = searchParams.clientId;

  if (!clientId) {
    return (
      <>
        <PageHeader
          title="Upload CAS"
          description="Upload a client's CAS statement for instant portfolio intelligence"
        />
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-muted-foreground">
              Select a client first to upload their CAS statement.
            </p>
            <Button asChild>
              <Link href="/clients">Go to Clients</Link>
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  const client = await prisma.client.findUnique({ where: { id: clientId } });

  if (!client || client.userId !== session.user.id) {
    return (
      <>
        <PageHeader title="Upload CAS" description="Client not found" />
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            This client could not be found or you don't have access to it.
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Upload CAS — ${client.name}`}
        description="Upload a CAS PDF for instant portfolio intelligence: risk score, insights, and AI analyst chat"
      />
      <CASUploader clientId={client.id} />
    </>
  );
}
