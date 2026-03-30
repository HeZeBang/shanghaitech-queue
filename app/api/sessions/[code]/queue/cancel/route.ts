import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { queueEntries, sessions, students } from "@/db/schema";
import { cancelQueueSchema } from "@/lib/validators";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const parsed = cancelQueueSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const session = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.code, code.toUpperCase()))
      .limit(1);

    if (session.length === 0) {
      return NextResponse.json({ error: "课堂不存在" }, { status: 404 });
    }

    const [entry] = await db
      .select({
        id: queueEntries.id,
        status: queueEntries.status,
      })
      .from(queueEntries)
      .innerJoin(students, eq(queueEntries.studentId, students.id))
      .where(
        and(
          eq(queueEntries.id, parsed.data.entryId),
          eq(queueEntries.sessionId, session[0].id),
          eq(students.studentId, parsed.data.studentId)
        )
      )
      .limit(1);

    if (!entry) {
      return NextResponse.json({ error: "排队记录不存在" }, { status: 404 });
    }

    if (entry.status !== "waiting") {
      return NextResponse.json(
        { error: "当前状态不可取消" },
        { status: 400 }
      );
    }

    await db
      .delete(queueEntries)
      .where(
        and(eq(queueEntries.id, entry.id), eq(queueEntries.sessionId, session[0].id))
      );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "取消排队失败" }, { status: 500 });
  }
}
