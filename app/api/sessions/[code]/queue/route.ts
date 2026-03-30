import { NextResponse } from "next/server";
import { db } from "@/db";
import { queueEntries, students, sessions } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { joinQueueSchema } from "@/lib/validators";
import { requireTeacher } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const session = await db
    .select()
    .from(sessions)
    .where(eq(sessions.code, code.toUpperCase()))
    .limit(1);

  if (session.length === 0) {
    return NextResponse.json({ error: "课堂不存在" }, { status: 404 });
  }

  const queue = await db
    .select({
      id: queueEntries.id,
      position: queueEntries.position,
      status: queueEntries.status,
      joinedAt: queueEntries.joinedAt,
      checkStartedAt: queueEntries.checkStartedAt,
      checkEndedAt: queueEntries.checkEndedAt,
      notes: queueEntries.notes,
      studentId: students.studentId,
      studentName: students.name,
    })
    .from(queueEntries)
    .innerJoin(students, eq(queueEntries.studentId, students.id))
    .where(eq(queueEntries.sessionId, session[0].id))
    .orderBy(queueEntries.position);

  return NextResponse.json(queue);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const parsed = joinQueueSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.code, code.toUpperCase()))
      .limit(1);

    if (session.length === 0) {
      return NextResponse.json({ error: "课堂不存在" }, { status: 404 });
    }

    if (session[0].status === "closed") {
      return NextResponse.json({ error: "课堂已关闭" }, { status: 400 });
    }

    // Find or create student
    let student = await db
      .select()
      .from(students)
      .where(
        and(
          eq(students.sessionId, session[0].id),
          eq(students.studentId, parsed.data.studentId)
        )
      )
      .limit(1);

    if (student.length === 0) {
      // Auto-create student entry
      const [created] = await db
        .insert(students)
        .values({
          sessionId: session[0].id,
          studentId: parsed.data.studentId,
          name: parsed.data.studentId, // default name = student ID
        })
        .returning();
      student = [created];
    }

    // Check if already in queue
    const existing = await db
      .select()
      .from(queueEntries)
      .where(
        and(
          eq(queueEntries.sessionId, session[0].id),
          eq(queueEntries.studentId, student[0].id)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: "你已在队列中",
          entry: existing[0],
        },
        { status: 409 }
      );
    }

    // Get next position
    const maxPos = await db
      .select({ max: sql<number>`COALESCE(MAX(${queueEntries.position}), 0)` })
      .from(queueEntries)
      .where(eq(queueEntries.sessionId, session[0].id));

    const position = (maxPos[0]?.max ?? 0) + 1;

    const [entry] = await db
      .insert(queueEntries)
      .values({
        sessionId: session[0].id,
        studentId: student[0].id,
        position,
      })
      .returning();

    return NextResponse.json(entry, { status: 201 });
  } catch {
    return NextResponse.json({ error: "加入排队失败" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const auth = await requireTeacher(code.toUpperCase());
  if (!auth) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  await db
    .delete(queueEntries)
    .where(eq(queueEntries.sessionId, auth.sessionId));

  return NextResponse.json({ success: true });
}
