import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ClientRow {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

export function ClientTable({ clients }: { clients: ClientRow[] }) {
  if (clients.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">No clients yet.</p>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="pb-3 font-medium">Name</th>
          <th className="pb-3 font-medium">Email</th>
          <th className="pb-3 font-medium">Phone</th>
          <th className="pb-3" />
        </tr>
      </thead>
      <tbody>
        {clients.map((c) => (
          <tr key={c.id} className="border-b">
            <td className="py-3 font-medium">{c.name}</td>
            <td className="py-3">{c.email ?? "—"}</td>
            <td className="py-3">{c.phone ?? "—"}</td>
            <td className="py-3 text-right">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/clients/${c.id}`}>View</Link>
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
