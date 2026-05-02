import { prisma } from "@/lib/db/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

// ✏️ UPDATE TASK
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const session = await getServerSession();

    console.log("SESSION EMAIL:", session?.user?.email);

    if (!session?.user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    console.log("USER ID:", user?.id);
    console.log("TASK ID:", id);

    const body = await req.json();

    const result = await prisma.task.updateMany({
      where: {
        id,
        userId: user!.id,
      },
      data: {
        status: body.status,
      },
    });

    console.log("UPDATE RESULT:", result);

    if (result.count === 0) {
      console.log("BLOCKED UPDATE ❌");
      return new NextResponse("Unauthorized", { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH ERROR:", error);
    return new NextResponse("Server Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const session = await getServerSession();

    console.log("SESSION EMAIL:", session?.user?.email);

    if (!session?.user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    console.log("USER ID:", user?.id);
    console.log("TASK ID:", id);

    const result = await prisma.task.deleteMany({
      where: {
        id,
        userId: user!.id,
      },
    });

    console.log("DELETE RESULT:", result);

    if (result.count === 0) {
      console.log("BLOCKED DELETE ❌");
      return new NextResponse("Unauthorized", { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE ERROR:", error);
    return new NextResponse("Server Error", { status: 500 });
  }
}