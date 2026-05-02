import { NextResponse } from "next/server";
import { subscribe } from "@/lib/realtime";

export async function GET(req: Request) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  const unsub = subscribe(async (msg) => {
    try {
      await writer.ready;
      await writer.write(new TextEncoder().encode(msg));
    } catch (e) {
      // ignore
    }
  });

  // send a comment to keep connection alive
  const keepAlive = setInterval(() => {
    writer.write(new TextEncoder().encode(`: heartbeat\n\n`));
  }, 20000);

  // cleanup when client disconnects
  (req as any).signal?.addEventListener?.("abort", () => {
    clearInterval(keepAlive);
    unsub();
    try {
      writer.close();
    } catch (e) {}
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
