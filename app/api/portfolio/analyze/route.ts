import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeAndPersistPortfolio } from "@/lib/portfolio/analyze";
import type { CASParsedData } from "@/types/cas.types";

interface AnalyzeRequestBody {
  casUploadId: string;
}

/**
 * POST /api/portfolio/analyze
 * Body: { casUploadId: string }
 *
 * Runs the full Portfolio Intelligence pipeline (analytics + insight engine
 * + scoring + AI explanation) for an already-parsed CAS upload and persists
 * the results. Returns the PortfolioAnalysisResponse.
 *
 * Requires the CAS upload's client to belong to the authenticated user.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: AnalyzeRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.casUploadId) {
    return NextResponse.json({ error: "casUploadId is required" }, { status: 400 });
  }

  const casUpload = await prisma.cASUpload.findUnique({
    where: { id: body.casUploadId },
    include: { client: true },
  });

  if (!casUpload) {
    return NextResponse.json({ error: "CAS upload not found" }, { status: 404 });
  }

  if (casUpload.client.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!casUpload.parsedData) {
    return NextResponse.json(
      { error: "CAS upload has not been parsed yet" },
      { status: 409 }
    );
  }

  try {
    const result = await analyzeAndPersistPortfolio(
      casUpload.id,
      casUpload.clientId,
      casUpload.parsedData as unknown as CASParsedData
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error(JSON.stringify({ event: "portfolio_analyze_error", error: String(err) }));
    return NextResponse.json({ error: "Failed to analyze portfolio" }, { status: 500 });
  }
}
