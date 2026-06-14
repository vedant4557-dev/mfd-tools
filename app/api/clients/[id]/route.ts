import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientSchema } from "@/lib/validations/client.schema";

async function getClient(id: string, userId: string) {
  return prisma.client.findFirst({ where: { id, userId } });
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const client = await getClient(params.id, session.user.id);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ client });
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const existing = await getClient(params.id, session.user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = clientSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const client = await prisma.client.update({
    where: { id: params.id },
    data: parsed.data,
  });
  return NextResponse.json({ client });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const existing = await getClient(params.id, session.user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.client.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
