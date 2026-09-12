import { z } from "zod";
const schema = z.object({
  movie: z.string().min(1).max(300),
  path: z
    .string()
    .max(1500)
    .regex(/^\/stores\/[a-z-]+\/watch\//),
  episode: z.string().max(150),
  provider: z.string().max(50),
  source: z.string().max(200),
  errorCode: z.string().max(150),
  position: z.number().finite().min(0).max(1000000),
  reason: z.enum(["not-playing", "buffering", "wrong-episode", "audio"]),
  description: z.string().max(1000),
});
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  const text = await request.text();
  if (text.length > 8000)
    return Response.json({ error: "Report too large" }, { status: 413 });
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return Response.json({ error: "Invalid report" }, { status: 400 });
  const reportId = crypto.randomUUID();
  console.info(
    JSON.stringify({
      event: "playback-report",
      reportId,
      createdAt: new Date().toISOString(),
      ...parsed.data,
    }),
  );
  return Response.json(
    { reportId },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
