import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type CASUploadStatus = "queued" | "parsing" | "completed" | "failed";

/**
 * GET /api/generate/status/[casUploadId]
 *
 * Derives processing status from CASUpload row state (no separate status
 * enum/table — status is computed from parsedData/parseError/timestamps):
 *  - "failed":    parseError is set
 *  - "completed": parsedData is set (analysis has run by the time this is true,
 *                  since the worker calls analyzeAndPersistPortfolio synchronously
 *                  after setting parsedData)
 *  - "queued":    neither set, created very recently (< 2 min) — likely still
 *                  in the BullMQ queue or being parsed
 *  - "parsing":   neither set, created > 2 min ago but < 10 min — still processing
 *                  (large CAS files can take a while)
 *  - "failed" (stale): neither set, created > 10 min ago — likely lost job
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

  let status: CASUploadStatus;
  if (casUpload.parseError) {
    status = "failed";
  } else if (casUpload.parsedData) {
    status = "completed";
  } else {
    const ageMs = Date.now() - casUpload.createdAt.getTime();
    const TEN_MINUTES = 10 * 60 * 1000;
    const TWO_MINUTES = 2 * 60 * 1000;
    if (ageMs > TEN_MINUTES) {
      status = "failed";
    } else if (ageMs > TWO_MINUTES) {
      status = "parsing";
    } else {
      status = "queued";
    }
  }

  return NextResponse.json({
    casUploadId: casUpload.id,
    status,
    fileName: casUpload.fileName,
    clientId: casUpload.clientId,
    parseError: casUpload.parseError,
    createdAt: casUpload.createdAt.toISOString(),
    parsedAt: casUpload.parsedAt?.toISOString() ?? null,
  });
}
