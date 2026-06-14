import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Deck preview" };

export default function DeckDetailPage({ params }: { params: { id: string } }) {
  return (
    <>
      <PageHeader title="Deck preview" description={`Deck ID: ${params.id}`} />
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          PDF preview — generate feature phase.
        </CardContent>
      </Card>
    </>
  );
}
