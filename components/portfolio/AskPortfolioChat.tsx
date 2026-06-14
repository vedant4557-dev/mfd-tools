"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PortfolioChatMessage } from "@/types/portfolio.types";
import { cn } from "@/lib/utils";

const SUGGESTED_QUESTIONS = [
  "Why is this portfolio risky?",
  "Which funds overlap?",
  "What should I discuss with the client?",
  "How can returns improve?",
];

export function AskPortfolioChat({ casUploadId }: { casUploadId: string }) {
  const [messages, setMessages] = useState<PortfolioChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(content: string) {
    if (!content.trim() || loading) return;

    const next: PortfolioChatMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/portfolio/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ casUploadId, messages: next }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }

      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ask Portfolio</CardTitle>
      </CardHeader>
      <CardContent>
        {messages.length === 0 && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <Button
                  key={q}
                  variant="outline"
                  size="sm"
                  onClick={() => send(q)}
                  disabled={loading}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div ref={scrollRef} className="max-h-96 overflow-y-auto space-y-3 mb-4 pr-1">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "rounded-lg px-4 py-2 text-sm max-w-[85%]",
                m.role === "user"
                  ? "bg-primary text-primary-foreground ml-auto"
                  : "bg-muted text-foreground"
              )}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="rounded-lg px-4 py-2 text-sm bg-muted text-muted-foreground max-w-[85%]">
              Thinking…
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive mb-2">{error}</p>}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this portfolio..."
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !input.trim()}>
            Send
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
