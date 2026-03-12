import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

// Simple in-memory event bus for SSE
type Listener = {
  userId: string;
  groupIds: string[];
  controller: ReadableStreamDefaultController;
};

const listeners: Set<Listener> = new Set();

export function emitEvent(groupId: string, event: { type: string; data: unknown }) {
  const message = `data: ${JSON.stringify({ ...event, groupId })}\n\n`;
  for (const listener of listeners) {
    if (listener.groupIds.includes(groupId)) {
      try {
        listener.controller.enqueue(new TextEncoder().encode(message));
      } catch {
        listeners.delete(listener);
      }
    }
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const groupIds = req.nextUrl.searchParams.get("groupIds")?.split(",") || [];

  const stream = new ReadableStream({
    start(controller) {
      const listener: Listener = {
        userId: session.user!.id!,
        groupIds,
        controller,
      };
      listeners.add(listener);

      // Send keepalive every 30s
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepalive);
          listeners.delete(listener);
        }
      }, 30000);

      // Clean up on close
      req.signal.addEventListener("abort", () => {
        clearInterval(keepalive);
        listeners.delete(listener);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
