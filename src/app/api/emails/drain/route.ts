import { drainEmailQueue } from "@/lib/email-queue";

// Hit by the client-side polling loop (useDrainEmailQueue) while a batch is
// actively draining.
export async function POST() {
  const result = await drainEmailQueue({ limit: 5 });
  return Response.json(result);
}

// Hit by Vercel Cron (see vercel.json) — the durable backstop that drains
// any leftover queued rows even when no browser tab is open to poll. Vercel
// Cron always triggers via GET, and attaches this Authorization header
// automatically when CRON_SECRET is set, so this is the one call site that
// needs its own auth check — proxy.ts's matcher excludes /api entirely, so
// nothing else is protecting this route.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await drainEmailQueue({ limit: 5 });
  return Response.json(result);
}
