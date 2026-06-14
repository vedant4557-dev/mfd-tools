import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Decks" };

export default function DecksPage() {
  return (
    <>
      <PageHeader title="Review decks" description="All generated client review decks" />
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No decks generated yet.
        </CardContent>
      </Card>
    </>
  );
}
