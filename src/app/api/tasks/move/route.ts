import { prisma } from "@/lib/db/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { publish } from "@/lib/realtime";
import type { Task } from "@/types/task";

const columns: Task["status"][] = ["TODO", "IN_PROGRESS", "DONE"];

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { taskId, overId } = await req.json();

    const dbTasks = await prisma.task.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: [{ status: "asc" }, { position: "asc" }],
    });

    const active = dbTasks.find((t) => t.id === taskId);
    if (!active) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // -----------------------------
    // 1. Determine new status
    // -----------------------------
    let newStatus = active.status;

    if (columns.includes(overId)) {
      newStatus = overId;
    } else {
      const overTask = dbTasks.find((t) => t.id === overId);
      if (overTask) newStatus = overTask.status;
    }

    // -----------------------------
    // 2. Group
    // -----------------------------
    const grouped: Record<Task["status"], typeof dbTasks> = {
      TODO: [],
      IN_PROGRESS: [],
      DONE: [],
    };

    for (const t of dbTasks) {
      if (t.id !== taskId) {
        grouped[t.status].push(t);
      }
    }

    const target = grouped[newStatus];

    const overIndex = target.findIndex((t) => t.id === overId);
    const insertIndex = overIndex === -1 ? target.length : overIndex;

    target.splice(insertIndex, 0, {
      ...active,
      status: newStatus,
    });

    // -----------------------------
    // 3. Reindex
    // -----------------------------
    const rebuilt = [
      ...grouped.TODO,
      ...grouped.IN_PROGRESS,
      ...grouped.DONE,
    ].map((t, i) => ({
      ...t,
      position: i,
    }));

    // -----------------------------
    // 4. Persist
    // -----------------------------
    await prisma.$transaction(
      rebuilt.map((t) =>
        prisma.task.update({
          where: { id: t.id },
          data: {
            status: t.status,
            position: t.position,
          },
        })
      )
    );


    const updatedDbTasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
      },
      orderBy: [
        { status: "asc" },
        { position: "asc" },
      ],
    });

    const serialized: Task[] = updatedDbTasks.map((t) => ({
      ...t,
      description: t.description ?? undefined,
      deletedAt: t.deletedAt ? t.deletedAt.toISOString() : null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    // -----------------------------
    // 6. Broadcast
    // -----------------------------
    publish("bulk_update", serialized);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("MOVE ERROR:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}