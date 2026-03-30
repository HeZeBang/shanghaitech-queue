import { NextResponse } from "next/server";
import { db } from "@/db";
import { students, queueEntries } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireTeacher } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string; id: string }> }
) {
  const { code, id } = await params;
  const auth = await requireTeacher(code.toUpperCase());
  if (!auth) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const body = await request.json();
  const { name, email, studentId } = body as {
    name?: string;
    email?: string;
    studentId?: string;
  };

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email || null;
  if (studentId !== undefined) updateData.studentId = studentId;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "无修改内容" }, { status: 400 });
  }

  const [updated] = await db
    .update(students)
    .set(updateData)
    .where(eq(students.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "学生不存在" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ code: string; id: string }> }
) {
  const { code, id } = await params;
  const auth = await requireTeacher(code.toUpperCase());
  if (!auth) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  await db.delete(students).where(eq(students.id, id));
  return NextResponse.json({ success: true });
}

// Teacher directly adds a student to queue (or marks as done/absent)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string; id: string }> }
) {
  const { code, id } = await params;
  const auth = await requireTeacher(code.toUpperCase());
  if (!auth) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const body = await request.json();
  const { action } = body as { action: "queue" | "checking" | "done" | "absent" };

  // Check if student already in queue
  const existing = await db
    .select()
    .from(queueEntries)
    .where(
      and(
        eq(queueEntries.sessionId, auth.sessionId),
        eq(queueEntries.studentId, id)
      )
    )
    .limit(1);

  if (action === "queue") {
    if (existing.length > 0) {
      return NextResponse.json({ error: "该学生已在队列中" }, { status: 409 });
    }

    const maxPos = await db
      .select({
        max: sql<number>`COALESCE(MAX(${queueEntries.position}), 0)`,
      })
      .from(queueEntries)
      .where(eq(queueEntries.sessionId, auth.sessionId));

    const [entry] = await db
      .insert(queueEntries)
      .values({
        sessionId: auth.sessionId,
        studentId: id,
        position: (maxPos[0]?.max ?? 0) + 1,
      })
      .returning();

    return NextResponse.json(entry, { status: 201 });
  }

  // For checking/done/absent: update existing entry or create one
  const now = new Date();

  if (existing.length > 0) {
    const updateData: Record<string, unknown> = { status: action };
    if (action === "checking") updateData.checkStartedAt = now;
    if (action === "done" || action === "absent") updateData.checkEndedAt = now;

    const [updated] = await db
      .update(queueEntries)
      .set(updateData)
      .where(eq(queueEntries.id, existing[0].id))
      .returning();

    return NextResponse.json(updated);
  }

  // No queue entry exists — create one with the target status directly
  const maxPos = await db
    .select({
      max: sql<number>`COALESCE(MAX(${queueEntries.position}), 0)`,
    })
    .from(queueEntries)
    .where(eq(queueEntries.sessionId, auth.sessionId));

  const [entry] = await db
    .insert(queueEntries)
    .values({
      sessionId: auth.sessionId,
      studentId: id,
      position: (maxPos[0]?.max ?? 0) + 1,
      status: action as "waiting" | "checking" | "done" | "absent",
      checkStartedAt: action === "checking" || action === "done" ? now : undefined,
      checkEndedAt: action === "done" || action === "absent" ? now : undefined,
    })
    .returning();

  return NextResponse.json(entry, { status: 201 });
}
