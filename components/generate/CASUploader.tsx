"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, FileText, Loader2 } from "lucide-react";

interface CASUploaderProps {
  clientId: string;
}

type UploadState = "idle" | "uploading" | "queued" | "parsing" | "completed" | "failed";

const POLL_INTERVAL_MS = 3000;

/**
 * CAS PDF drag-drop uploader. On successful upload, polls
 * GET /api/generate/status/[casUploadId] until processing completes,
 * then redirects to /portfolio/[casUploadId].
 */
export function CASUploader({ clientId }: CASUploaderProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [state, setState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [casUploadId, setCasUploadId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  function handleFileSelect(selected: File | null) {
    setError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    if (selected.type !== "application/pdf") {
      setError("Only PDF files are accepted.");
      return;
    }
    if (selected.size > 15 * 1024 * 1024) {
      setError("File exceeds 15MB limit.");
      return;
    }
    setFile(selected);
  }

  function pollStatus(id: string) {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/generate/status/${id}`);
        if (!res.ok) throw new Error(`Status check failed (${res.status})`);
        const data = await res.json();

        if (data.status === "completed") {
          clearInterval(interval);
          setState("completed");
          router.push(`/portfolio/${id}`);
        } else if (data.status === "failed") {
          clearInterval(interval);
          setState("failed");
          setError(data.parseError ?? "Processing failed. Please try again.");
        } else {
          setState(data.status);
        }
      } catch (err) {
        clearInterval(interval);
        setState("failed");
        setError(err instanceof Error ? err.message : "Status check failed");
      }
    }, POLL_INTERVAL_MS);
  }

  async function handleUpload() {
    if (!file) return;
    setError(null);
    setState("uploading");

    const formData = new FormData();
    formData.append("clientId", clientId);
    formData.append("file", file);
    if (password) formData.append("password", password);

    try {
      const res = await fetch("/api/generate/upload", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? `Upload failed (${res.status})`);
      }

      setCasUploadId(data.casUploadId);
      setState("queued");
      pollStatus(data.casUploadId);
    } catch (err) {
      setState("failed");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function handleRetry() {
    if (!casUploadId) return;
    setError(null);
    setState("queued");
    try {
      const res = await fetch(`/api/generate/retry/${casUploadId}`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Retry failed (${res.status})`);
      }
      pollStatus(casUploadId);
    } catch (err) {
      setState("failed");
      setError(err instanceof Error ? err.message : "Retry failed");
    }
  }

  const isBusy = state === "uploading" || state === "queued" || state === "parsing";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload CAS Statement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFileSelect(e.dataTransfer.files?.[0] ?? null);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors ${
            dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
            disabled={isBusy}
          />
          {file ? (
            <>
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </>
          ) : (
            <>
              <UploadCloud className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">Drag and drop your CAS PDF here</p>
              <p className="text-sm text-muted-foreground">or click to browse (max 15MB)</p>
            </>
          )}
        </div>

        <div>
          <Label htmlFor="cas-password">PDF Password (if protected)</Label>
          <Input
            id="cas-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank if not password-protected"
            disabled={isBusy}
            className="mt-1"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {state === "failed" && casUploadId ? (
          <Button onClick={handleRetry} variant="outline">
            Retry processing
          </Button>
        ) : (
          <Button onClick={handleUpload} disabled={!file || isBusy}>
            {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
            {state === "uploading"
              ? "Uploading…"
              : state === "queued"
              ? "Queued…"
              : state === "parsing"
              ? "Analyzing portfolio…"
              : "Upload & Analyze"}
          </Button>
        )}

        {isBusy && (
          <p className="text-sm text-muted-foreground">
            This usually takes 30-90 seconds depending on portfolio size. You'll be redirected to
            the Portfolio Analyst automatically.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
