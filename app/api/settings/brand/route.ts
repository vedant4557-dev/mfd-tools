import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { brandSchema } from "@/lib/validations/brand.schema";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const brand = await prisma.brand.findUnique({
    where: { userId: session.user.id },
  });
  return NextResponse.json({ brand });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = brandSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const brand = await prisma.brand.upsert({
    where: { userId: session.user.id },
    create: { ...parsed.data, userId: session.user.id },
    update: parsed.data,
  });
  return NextResponse.json({ brand });
}
