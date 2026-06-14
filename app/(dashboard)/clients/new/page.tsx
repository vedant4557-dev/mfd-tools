import { PageHeader } from "@/components/layout/PageHeader";
import { AddClientForm } from "@/components/clients/AddClientForm";

export const metadata = { title: "Add client" };

export default function NewClientPage() {
  return (
    <>
      <PageHeader
        title="Add client"
        description="Create a new client profile to start uploading CAS statements"
      />
      <AddClientForm />
    </>
  );
}
