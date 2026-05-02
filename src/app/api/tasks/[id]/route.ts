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

    const updated = await prisma.task.updateMany({
      where: {
        id,
        userId: user.id,
      },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && {
          description: body.description,
        }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.position !== undefined && {
          position: body.position,
        }),
      },
    });

    if (updated.count === 0) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (task) {
      try {
        publish("updated", task);
      } catch {}
    }

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

    const result = await prisma.task.deleteMany({
      where: {
        id,
        userId: user.id,
      },
    });

    if (result.count === 0) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    try {
      publish("deleted", { id });
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE ERROR:", error);
    return new NextResponse("Server Error", { status: 500 });
  }
}