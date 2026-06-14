import { NextResponse } from "next/server";

/** Razorpay subscription webhooks — billing phase */
export async function POST() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
