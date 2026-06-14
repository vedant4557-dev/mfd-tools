import { PageHeader } from "@/components/layout/PageHeader";
import { BrandSettingsForm } from "@/components/settings/BrandSettingsForm";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Brand settings"
        description="Your firm identity, ARN number, and compliance disclaimer"
      />
      <BrandSettingsForm />
    </>
  );
}
