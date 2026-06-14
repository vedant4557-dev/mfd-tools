import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const deck = await prisma.deck.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { client: true, casUpload: true },
  });
  if (!deck) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ deck });
}
