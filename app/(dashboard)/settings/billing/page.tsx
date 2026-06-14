import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Billing" };

export default function BillingPage() {
  return (
    <>
      <PageHeader
        title="Billing & subscription"
        description="Free (3/mo) · Starter ₹999 · Pro ₹1999"
      />
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Razorpay billing — next phase.
        </CardContent>
      </Card>
    </>
  );
}
