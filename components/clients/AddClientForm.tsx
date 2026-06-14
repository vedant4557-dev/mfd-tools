"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const RISK_PROFILES = [
  { value: "", label: "Not specified" },
  { value: "conservative", label: "Conservative" },
  { value: "moderate", label: "Moderate" },
  { value: "aggressive", label: "Aggressive" },
];

export function AddClientForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState({
    name: "",
    email: "",
    phone: "",
    pan: "",
    riskProfile: "",
    notes: "",
  });

  function set(key: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setFields((prev) => ({ ...prev, [key]: e.target.value }));
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const body = {
        name: fields.name.trim(),
        email: fields.email.trim() || undefined,
        phone: fields.phone.trim() || undefined,
        pan: fields.pan.trim().toUpperCase() || undefined,
        riskProfile: fields.riskProfile || undefined,
        notes: fields.notes.trim() || undefined,
      };

      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);

      router.push(`/clients/${data.client.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="name">Full name *</Label>
            <Input
              id="name"
              value={fields.name}
              onChange={set("name")}
              placeholder="e.g. Rajesh Kumar"
              required
              minLength={2}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={fields.email}
                onChange={set("email")}
                placeholder="rajesh@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={fields.phone}
                onChange={set("phone")}
                placeholder="98xxxxxxxx"
                maxLength={15}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pan">PAN</Label>
              <Input
                id="pan"
                value={fields.pan}
                onChange={set("pan")}
                placeholder="ABCDE1234F"
                maxLength={10}
                className="mt-1 uppercase"
              />
            </div>
            <div>
              <Label htmlFor="riskProfile">Risk profile</Label>
              <select
                id="riskProfile"
                value={fields.riskProfile}
                onChange={set("riskProfile")}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {RISK_PROFILES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={fields.notes}
              onChange={set("notes")}
              placeholder="Investment goals, family situation, anything relevant…"
              maxLength={2000}
              rows={3}
              className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading || !fields.name.trim()}>
              {loading ? "Saving…" : "Add client"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
