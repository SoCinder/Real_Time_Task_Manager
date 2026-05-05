import { prisma } from "@/lib/db/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { publish } from "@/lib/realtime";

import type { Task } from "@/types/task";

const statusOrder: Record<Task["status"], number> = {
  TODO: 0,
  IN_PROGRESS: 1,
  DONE: 2,
};

// ---------------- GET ----------------
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) return NextResponse.json([]);

    const tasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
      },
      orderBy: [
        { status: "asc" },
        { position: "asc" },
      ],
    });

    return NextResponse.json(tasks);
  } catch (err) {
    console.error("GET /tasks crash:", err);
    return new NextResponse("Server Error", { status: 500 });
  }
}

// ---------------- POST (FIXED) ----------------
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const body = await req.json();

    // 🧠 get position
    const count = await prisma.task.count({
      where: {
        userId: user.id,
        status: body.status ?? "TODO",
        deletedAt: null,
      },
    });

    // 🧠 create task
    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description ?? "",
        status: body.status ?? "TODO",
        position: count,
        userId: user.id,
        deletedAt: null,
      },
    });

    // 🔥 CRITICAL: fetch fresh state
    const tasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
      },
      orderBy: [
        { status: "asc" },
        { position: "asc" },
      ],
    });

    // 🔥 CRITICAL: broadcast
    publish("bulk_update", tasks);

    return NextResponse.json(task);
  } catch (err) {
    console.error("POST /tasks crash:", err);
    return new NextResponse("Server Error", { status: 500 });
  }
}