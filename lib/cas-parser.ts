import type { CASParsedData } from "@/types/cas.types";

export interface ParseCASInput {
  storagePath: string;
  password?: string;
}

export async function parseCAS(_input: ParseCASInput): Promise<CASParsedData> {
  const baseUrl = process.env.RAILWAY_CAS_PARSER_URL;
  const secret = process.env.RAILWAY_CAS_PARSER_SECRET;
  if (!baseUrl) throw new Error("RAILWAY_CAS_PARSER_URL is not configured");

  const res = await fetch(`${baseUrl}/parse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify(_input),
  });

  if (!res.ok) {
    throw new Error(`CAS parser failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<CASParsedData>;
}
