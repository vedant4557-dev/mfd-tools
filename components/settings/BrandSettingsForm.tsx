"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEFAULT_DISCLAIMER =
  "Mutual fund investments are subject to market risks. Please read all scheme-related documents carefully before investing. Past performance is not indicative of future results.";

interface BrandFields {
  name: string;
  arnNumber: string;
  primaryColor: string;
  phone: string;
  email: string;
  disclaimer: string;
}

const DEFAULTS: BrandFields = {
  name: "",
  arnNumber: "",
  primaryColor: "#1B4F72",
  phone: "",
  email: "",
  disclaimer: DEFAULT_DISCLAIMER,
};

export function BrandSettingsForm() {
  const [fields, setFields] = useState<BrandFields>(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/brand")
      .then((r) => r.json())
      .then((data) => {
        if (data.brand) {
          setFields({
            name: data.brand.name ?? "",
            arnNumber: data.brand.arnNumber ?? "",
            primaryColor: data.brand.primaryColor ?? "#1B4F72",
            phone: data.brand.phone ?? "",
            email: data.brand.email ?? "",
            disclaimer: data.brand.disclaimer ?? DEFAULT_DISCLAIMER,
          });
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  function set(key: keyof BrandFields) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setSaved(false);
      setFields((prev) => ({ ...prev, [key]: e.target.value }));
    };
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);

    try {
      const body = {
        name: fields.name.trim(),
        arnNumber: fields.arnNumber.trim() || undefined,
        primaryColor: fields.primaryColor,
        phone: fields.phone.trim() || undefined,
        email: fields.email.trim() || undefined,
        disclaimer: fields.disclaimer.trim() || undefined,
      };

      const res = await fetch("/api/settings/brand", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);

      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground text-sm">
          Loading settings…
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSave}>
      <Card>
        <CardHeader>
          <CardTitle>Firm identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firm-name">Firm / practice name *</Label>
              <Input
                id="firm-name"
                value={fields.name}
                onChange={set("name")}
                placeholder="e.g. Sharma Wealth Advisors"
                required
                minLength={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="arn">AMFI ARN number</Label>
              <Input
                id="arn"
                value={fields.arnNumber}
                onChange={set("arnNumber")}
                placeholder="ARN-XXXXXX"
                maxLength={20}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="brand-phone">Contact phone</Label>
              <Input
                id="brand-phone"
                type="tel"
                value={fields.phone}
                onChange={set("phone")}
                placeholder="98xxxxxxxx"
                maxLength={15}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="brand-email">Contact email</Label>
              <Input
                id="brand-email"
                type="email"
                value={fields.email}
                onChange={set("email")}
                placeholder="info@yourfirm.com"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="primary-color">Brand colour</Label>
            <div className="mt-1 flex items-center gap-3">
              <input
                id="primary-color"
                type="color"
                value={fields.primaryColor}
                onChange={set("primaryColor")}
                className="h-10 w-14 cursor-pointer rounded border border-input bg-background"
              />
              <Input
                value={fields.primaryColor}
                onChange={set("primaryColor")}
                placeholder="#1B4F72"
                pattern="^#[0-9A-Fa-f]{6}$"
                maxLength={7}
                className="w-32 font-mono"
              />
              <span className="text-xs text-muted-foreground">
                Used in generated reports and decks
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor="disclaimer">SEBI/AMFI disclaimer</Label>
            <textarea
              id="disclaimer"
              value={fields.disclaimer}
              onChange={set("disclaimer")}
              rows={4}
              maxLength={5000}
              className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Appended to every generated report and client communication.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {saved && (
            <p className="text-sm text-emerald-600 font-medium">Settings saved.</p>
          )}

          <Button type="submit" disabled={loading || !fields.name.trim()}>
            {loading ? "Saving…" : "Save settings"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
