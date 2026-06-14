import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadPortfolioAnalysis } from "@/lib/portfolio/analyze";

/**
 * GET /api/portfolio/[casUploadId]
 *
 * Returns the previously computed PortfolioAnalysisResponse for this CAS
 * upload, or 404 if analysis hasn't been run yet (client should then POST
 * to /api/portfolio/analyze).
 */
export async function GET(
  _req: Request,
  { params }: { params: { casUploadId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const casUpload = await prisma.cASUpload.findUnique({
    where: { id: params.casUploadId },
    include: { client: true },
  });

  if (!casUpload) {
    return NextResponse.json({ error: "CAS upload not found" }, { status: 404 });
  }

  if (casUpload.client.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const analysis = await loadPortfolioAnalysis(params.casUploadId);
  if (!analysis) {
    return NextResponse.json(
      { error: "Analysis not found. Trigger analysis first via POST /api/portfolio/analyze." },
      { status: 404 }
    );
  }

  return NextResponse.json(analysis);
}
