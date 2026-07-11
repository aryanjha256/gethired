import { drainEmailQueue } from "@/lib/email-queue";

export async function POST() {
  const result = await drainEmailQueue({ limit: 5 });
  return Response.json(result);
}
