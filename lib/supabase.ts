import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase environment variables are not configured");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function uploadToSupabase(
  path: string,
  data: Buffer | Uint8Array,
  contentType: string,
  bucket = "cas-uploads"
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(bucket).upload(path, data, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`Supabase upload failed: ${error.message}`);
}

export async function getSignedUrl(
  path: string,
  bucket = "generated-decks",
  expiresIn = 3600
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${error?.message ?? "unknown"}`);
  }
  return data.signedUrl;
}
