import { prisma } from "@/lib/db/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { publish } from "@/lib/realtime";

export async function PATCH(
  req: Request,
  context: any
) {
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

    const { id } = await context.params;

    if (!id) {
      return new NextResponse("Missing ID", { status: 400 });
    }

    const body = await req.json();

    // 🔥 ensure ownership
    const existing = await prisma.task.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== user.id) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    let newPosition = body.position;

    // 🔥 if moving across columns → compute correct position
    if (body.status && body.status !== existing.status) {
      const count = await prisma.task.count({
        where: {
          userId: user.id,
          status: body.status,
        },
      });

      newPosition = count;
    }

    // 🔥 update task (single row, not updateMany)
    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && {
          description: body.description,
        }),
        ...(body.status !== undefined && { status: body.status }),
        ...(newPosition !== undefined && {
          position: newPosition,
        }),
      },
    });

    // 🔥 realtime publish (safe)
    try {
      console.log("🔥 PUBLISH CALLED", task.id);

      publish("updated", {
        ...task,
        _source: "server",
      });
    } catch {}

    return NextResponse.json(task);
  } catch (error) {
    console.error("PATCH ERROR:", error);
    return new NextResponse("Server Error", { status: 500 });
  }
}

export async function DELETE(req: Request, context: any) {
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

    const { id } = await context.params;

    if (!id) {
      return new NextResponse("Missing ID", { status: 400 });
    }

    const existing = await prisma.task.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== user.id) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    await prisma.task.delete({
      where: { id },
    });

    try {
      publish("deleted", { id });
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE ERROR:", error);
    return new NextResponse("Server Error", { status: 500 });
  }
}