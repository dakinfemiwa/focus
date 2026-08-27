import { TodayOverview } from "@/components/dashboard/today-overview";
import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";

export default function Home() {
  return (
    <AppShell>
      <PageContainer>
        <PageHeader title="Dashboard" description="Tuesday, 25 August" />

        <div className="mt-8">
          <TodayOverview />
        </div>
      </PageContainer>
    </AppShell>
  );
}
