import { NextRequest, NextResponse } from "next/server";

import { recordPlaybackFeedback } from "@/lib/catalog/repository";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceId, success, startupLatencyMs, error } = body;

    if (!sourceId) {
      return NextResponse.json({ error: "sourceId is required" }, { status: 400 });
    }

    const recorded = await recordPlaybackFeedback({
      sourceId,
      success: Boolean(success),
      startupLatencyMs: startupLatencyMs ?? null,
      error: error ?? null,
    });

    return NextResponse.json({ success: true, recorded });
  } catch (error) {
    console.error("[API/feedback] Error:", error);
    return NextResponse.json({ error: "Failed to record feedback" }, { status: 500 });
  }
}
