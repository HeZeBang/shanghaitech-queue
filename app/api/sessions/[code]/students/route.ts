import { NextResponse } from "next/server";
import { db } from "@/db";
import { students, sessions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireTeacher } from "@/lib/auth";
import { importStudentsSchema } from "@/lib/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const auth = await requireTeacher(code.toUpperCase());
  if (!auth) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const list = await db
    .select()
    .from(students)
    .where(eq(students.sessionId, auth.sessionId))
    .orderBy(students.studentId);

  return NextResponse.json(list);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const auth = await requireTeacher(code.toUpperCase());
    if (!auth) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = importStudentsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Check session exists
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, auth.sessionId))
      .limit(1);

    if (session.length === 0) {
      return NextResponse.json({ error: "课堂不存在" }, { status: 404 });
    }

    const values = parsed.data.students.map((s) => ({
      sessionId: auth.sessionId,
      studentId: s.studentId,
      name: s.name,
      email: s.email || null,
    }));

    // Upsert: on conflict update name/email
    let inserted = 0;
    for (const v of values) {
      const existing = await db
        .select()
        .from(students)
        .where(
          and(
            eq(students.sessionId, v.sessionId),
            eq(students.studentId, v.studentId)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(students).values(v);
        inserted++;
      } else {
        await db
          .update(students)
          .set({ name: v.name, email: v.email })
          .where(eq(students.id, existing[0].id));
      }
    }

    return NextResponse.json({
      imported: inserted,
      updated: values.length - inserted,
      total: values.length,
    });
  } catch {
    return NextResponse.json({ error: "导入失败" }, { status: 500 });
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

  await db.delete(students).where(eq(students.sessionId, auth.sessionId));

  return NextResponse.json({ success: true });
}
