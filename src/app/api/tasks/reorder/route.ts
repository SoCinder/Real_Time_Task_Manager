import { prisma } from "@/lib/db/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { publish } from "@/lib/realtime";

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

    const { tasks } = await req.json();

    // 🔥 overwrite ALL tasks safely
    await prisma.$transaction(
      tasks.map((t: any) =>
        prisma.task.update({
          where: { id: t.id },
          data: {
            status: t.status,
            position: t.position,
          },
        })
      )
    );

    // 🔥 broadcast FULL snapshot
    publish("bulk_update", tasks);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("REORDER ERROR:", e);
    return new NextResponse("Server Error", { status: 500 });
  }
}