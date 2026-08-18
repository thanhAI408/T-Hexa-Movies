import { NextResponse } from "next/server";

import { providers } from "@/providers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const results = await Promise.allSettled(
      providers.map(async (provider) => {
        const health = await provider.healthCheck();
        return {
          id: provider.id,
          name: provider.displayName,
          baseUrl: provider.baseUrl,
          status: health.status,
          latencyMs: health.latencyMs,
          checkedAt: health.checkedAt,
        };
      }),
    );

    const data = results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      }
      return {
        id: providers[index]?.id ?? "unknown",
        name: providers[index]?.displayName ?? "Unknown",
        baseUrl: providers[index]?.baseUrl ?? "",
        status: "unavailable",
        latencyMs: null,
        checkedAt: new Date().toISOString(),
      };
    });

    return NextResponse.json({ providers: data });
  } catch (error) {
    console.error("[API/providers] Error:", error);
    return NextResponse.json({ error: "Failed to fetch provider status" }, { status: 500 });
  }
}
