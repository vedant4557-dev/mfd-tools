import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enqueueCASParse } from "@/lib/queue/cas-parse-queue";

/**
 * POST /api/generate/retry/[casUploadId]
 *
 * Re-enqueues a CAS parse job for an existing upload (e.g. after a
 * transient failure). Clears parseError so status returns to "queued".
 */
export async function POST(
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

  await prisma.cASUpload.update({
    where: { id: casUpload.id },
    data: { parseError: null },
  });

  const jobId = await enqueueCASParse(casUpload.id);
  return NextResponse.json({ casUploadId: casUpload.id, jobId }, { status: 202 });
}
