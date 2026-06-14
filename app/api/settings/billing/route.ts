import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });
  return NextResponse.json({ subscription });
}

export async function POST() {
  return NextResponse.json({ error: "Billing not implemented yet" }, { status: 501 });
}
