import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ClientCardProps {
  id: string;
  name: string;
  email?: string | null;
}

export function ClientCard({ id, name, email }: ClientCardProps) {
  return (
    <Link href={`/clients/${id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-base">{name}</CardTitle>
        </CardHeader>
        {email && (
          <CardContent className="pt-0 text-sm text-muted-foreground">{email}</CardContent>
        )}
      </Card>
    </Link>
  );
}
