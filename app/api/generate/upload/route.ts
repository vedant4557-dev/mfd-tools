import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadToSupabase } from "@/lib/supabase";
import { encrypt } from "@/lib/crypto";
import { enqueueCASParse } from "@/lib/queue/cas-parse-queue";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB
const ALLOWED_TYPE = "application/pdf";

/**
 * POST /api/generate/upload
 * multipart/form-data fields:
 *   - clientId: string (required)
 *   - file: File (required, PDF)
 *   - password: string (optional, for password-protected CAS PDFs)
 *
 * Flow:
 * 1. Validate ownership of clientId, file type/size
 * 2. Upload PDF to Supabase storage (cas-uploads bucket)
 * 3. Create CASUpload row (password encrypted at rest if provided)
 * 4. Enqueue CAS parse + Portfolio Intelligence job (BullMQ)
 *
 * Returns { casUploadId, jobId } — client polls
 * GET /api/generate/status/[casUploadId] for progress.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const clientId = formData.get("clientId");
  const file = formData.get("file");
  const password = formData.get("password");

  if (typeof clientId !== "string" || !clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (file.type !== ALLOWED_TYPE) {
    return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File exceeds 15MB limit" }, { status: 400 });
  }

  if (password !== null && typeof password !== "string") {
    return NextResponse.json({ error: "password must be a string" }, { status: 400 });
  }

  // Verify the client belongs to the authenticated user
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  if (client.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isPasswordProtected = typeof password === "string" && password.length > 0;
  const storagePath = `${session.user.id}/${clientId}/${Date.now()}-${sanitizeFileName(file.name)}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadToSupabase(storagePath, buffer, ALLOWED_TYPE, "cas-uploads");
  } catch (err) {
    console.error(JSON.stringify({ event: "cas_upload_storage_error", error: String(err) }));
    return NextResponse.json({ error: "Failed to store uploaded file" }, { status: 502 });
  }

  let passwordEncrypted: string | null = null;
  if (isPasswordProtected) {
    try {
      passwordEncrypted = encrypt(password as string);
    } catch (err) {
      console.error(JSON.stringify({ event: "cas_password_encrypt_error", error: String(err) }));
      return NextResponse.json({ error: "Server misconfiguration: cannot store password" }, { status: 500 });
    }
  }

  const casUpload = await prisma.cASUpload.create({
    data: {
      clientId,
      storagePath,
      fileName: file.name,
      fileSize: file.size,
      isPasswordProtected,
      passwordEncrypted,
    },
  });

  try {
    const jobId = await enqueueCASParse(casUpload.id);
    return NextResponse.json({ casUploadId: casUpload.id, jobId }, { status: 202 });
  } catch (err) {
    console.error(JSON.stringify({ event: "cas_enqueue_error", error: String(err) }));
    // Upload succeeded but enqueue failed — leave parsedData null;
    // the status route will report "pending" and the user can retry.
    return NextResponse.json(
      { casUploadId: casUpload.id, jobId: null, warning: "Upload succeeded but processing could not be queued. Try refreshing status or retry." },
      { status: 202 }
    );
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}
