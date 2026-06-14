import { NextResponse } from "next/server";
import { syncFundMaster } from "@/lib/fund-master/sync";

/**
 * POST /api/admin/fund-master/sync
 * Header: Authorization: Bearer <CRON_SECRET>
 *
 * Manually triggers an AMFI Fund Master sync. Use for:
 * - Initial seed (don't wait for the 2 AM nightly job)
 * - Ad-hoc resync after adding manual expenseRatio overrides
 * - Health-check / monitoring (returns sync stats)
 *
 * Protected by CRON_SECRET env var (shared-secret pattern, consistent with
 * Vercel Cron / external scheduler triggers — no user session required).
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncFundMaster();
    return NextResponse.json(result);
  } catch (err) {
    console.error(JSON.stringify({ event: "fund_master_manual_sync_error", error: String(err) }));
    return NextResponse.json({ error: "Sync failed", detail: String(err) }, { status: 500 });
  }
}
