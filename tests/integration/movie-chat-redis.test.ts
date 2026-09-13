import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { reserveTurn, releaseTurn } from "@/lib/movie-chat/store";

// Opt-in against the provisioned Redis; never substitutes in-memory state.
it.skipIf(process.env.CHAT_LIVE_REDIS_EVAL !== "1")("Redis enforces concurrent owner locks and shared IP counters", async () => {
  const owner = `eval-${crypto.randomUUID()}`; const ip = `eval-${crypto.randomUUID()}`;
  const ids = Array.from({ length: 3 }, () => crypto.randomUUID());
  const concurrent = await Promise.allSettled(ids.map(id => reserveTurn(owner, ip, id)));
  expect(concurrent.filter(r => r.status === "fulfilled")).toHaveLength(1);
  expect(concurrent.filter(r => r.status === "rejected").every(r => r.reason.code === "BUSY")).toBe(true);
  for (const id of ids) await releaseTurn(owner, id);
  for (let i = 1; i < 8; i++) { const id = crypto.randomUUID(); await reserveTurn(owner, ip, id); await releaseTurn(owner, id); }
  await expect(reserveTurn(owner, ip, crypto.randomUUID())).rejects.toMatchObject({ code: "RATE_LIMIT" });
});
