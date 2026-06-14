import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { RecentDecks } from "@/components/dashboard/RecentDecks";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0];

  return (
  <>
      <PageHeader
        title={firstName ? `Welcome, ${firstName}` : "Welcome"}
        description="Overview of your practice and recent deck activity"
      />
      <StatsCards />
      <section className="mt-8">
        <RecentDecks />
      </section>
    </>
  );
}
