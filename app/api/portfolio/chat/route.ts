import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runPortfolioChat } from "@/lib/ai/portfolio-chat";
import type { PortfolioChatRequest } from "@/types/portfolio.types";

/**
 * POST /api/portfolio/chat
 * Body: { casUploadId: string, messages: PortfolioChatMessage[] }
 *
 * Ask Portfolio Chat — answers questions about a specific client's portfolio
 * using tool-calling grounded in persisted analytics/insights data only.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PortfolioChatRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.casUploadId || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json(
      { error: "casUploadId and a non-empty messages array are required" },
      { status: 400 }
    );
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

  try {
    const response = await runPortfolioChat(body.casUploadId, body.messages);
    return NextResponse.json(response);
  } catch (err) {
    console.error(JSON.stringify({ event: "portfolio_chat_error", error: String(err) }));
    return NextResponse.json({ error: "Failed to process chat request" }, { status: 500 });
  }
}
