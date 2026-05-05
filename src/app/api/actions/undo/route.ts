import { prisma } from "@/lib/db/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { publish } from "@/lib/realtime";

export async function POST() {
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

    // 🧠 get last action
    const lastAction = await prisma.action.findFirst({
      where: {
        userId: user.id,
        canceled: false,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!lastAction) {
      return NextResponse.json(
        { error: "Nothing to undo" },
        { status: 400 }
      );
    }

    const taskId = lastAction.taskId;

    if (!taskId) {
      return NextResponse.json(
        { error: "Invalid action (missing taskId)" },
        { status: 400 }
      );
    }

    // 🧠 reverse action
    switch (lastAction.type) {
      case "DELETE":
        await prisma.task.update({
          where: { id: taskId },
          data: { deletedAt: null },
        });
        break;

      case "CREATE":
        await prisma.task.update({
          where: { id: taskId },
          data: { deletedAt: new Date() },
        });
        break;

      case "UPDATE":
        await prisma.task.update({
          where: { id: taskId },
          data: lastAction.before as any,
        });
        break;
    }

    // mark action used (safer than delete)
    await prisma.action.update({
      where: { id: lastAction.id },
      data: { canceled: true },
    });

    // 🔥 IMPORTANT: broadcast FULL updated state
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

    publish("bulk_update", tasks);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("UNDO ERROR:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}