import { prisma } from "@/lib/db/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { publish } from "@/lib/realtime";
import type { Task } from "@/types/task";

type ReorderInput = {
  id: string;
  status: Task["status"];
  position: number;
};

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

    const tasks: ReorderInput[] = body.tasks;

    if (!Array.isArray(tasks)) {
      return new NextResponse("Invalid payload", { status: 400 });
    }

    // ---------------- SECURITY FILTER ----------------
    const userTasks: { id: string }[] = await prisma.task.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
      },
      select: { id: true },
    });

    const validIds = new Set(userTasks.map((t) => t.id));

    const safeTasks = tasks.filter((t) => validIds.has(t.id));

    // ---------------- TRANSACTION ----------------
    await prisma.$transaction(
      safeTasks.map((t) =>
        prisma.task.update({
          where: {
            id: t.id,
          },
          data: {
            status: t.status,
            position: t.position,
          },
        })
      )
    );

    // ---------------- REFRESH STATE ----------------
    const updatedTasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
      },
      orderBy: [
        { status: "asc" },
        { position: "asc" },
      ],
    });

    // ---------------- REALTIME SYNC ----------------
    publish("bulk_update", updatedTasks);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("REORDER ERROR:", e);
    return new NextResponse("Server Error", { status: 500 });
  }
}