import { prisma } from "@/lib/db/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { publish } from "@/lib/realtime";

// ---------------- PATCH ----------------
export async function PATCH(req: Request, context: any) {
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

    const { id } = await context.params;

    const body = await req.json();

    const existing = await prisma.task.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.description !== undefined && {
          description: body.description,
        }), // ✅ FIXED
      },
    });

    publish("updated", task);

    return NextResponse.json(task);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ---------------- DELETE (SOFT + UNDO SNAPSHOT) ----------------
export async function DELETE(req: Request, context: any) {
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

    const { id } = await context.params;

    const existing = await prisma.task.findFirst({
      where: {
        id,
        userId: user.id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // =========================
    // 1. CREATE ACTION SNAPSHOT (FULL STATE)
    // =========================
    await prisma.action.create({
      data: {
        type: "DELETE",
        taskId: existing.id,
        userId: user.id,

        before: existing as any, // ✅ includes description automatically

        expiresAt: new Date(Date.now() + 1000 * 60 * 5),
        canceled: false,
      },
    });

    // =========================
    // 2. SOFT DELETE TASK
    // =========================
    await prisma.task.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    // =========================
    // 3. BROADCAST UPDATE
    // =========================
    const tasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
      },
      orderBy: [{ status: "asc" }, { position: "asc" }],
    });

    publish("bulk_update", tasks);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}