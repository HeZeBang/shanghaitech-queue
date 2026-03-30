import { NextResponse } from "next/server";
import { db } from "@/db";
import { sessions, students, queueEntries } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireTeacher, signToken, setAuthCookie } from "@/lib/auth";
import { generateSessionCode } from "@/lib/session-code";
import { hashSync } from "bcryptjs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const session = await db
    .select({
      id: sessions.id,
      code: sessions.code,
      name: sessions.name,
      status: sessions.status,
      createdAt: sessions.createdAt,
    })
    .from(sessions)
    .where(eq(sessions.code, code.toUpperCase()))
    .limit(1);

  if (session.length === 0) {
    return NextResponse.json({ error: "课堂不存在" }, { status: 404 });
  }

  return NextResponse.json(session[0]);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const auth = await requireTeacher(code.toUpperCase());
  if (!auth) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const action = (body as { action?: string }).action || "close";

  if (action === "reopen") {
    // Reopen: set active + clear all queue entries
    await db
      .delete(queueEntries)
      .where(eq(queueEntries.sessionId, auth.sessionId));

    await db
      .update(sessions)
      .set({ status: "active" })
      .where(eq(sessions.code, code.toUpperCase()));

    return NextResponse.json({ success: true, action: "reopened" });
  }

  // Default: close
  await db
    .update(sessions)
    .set({ status: "closed" })
    .where(eq(sessions.code, code.toUpperCase()));

  return NextResponse.json({ success: true, action: "closed" });
}

// Clone session: copy student roster into a new session
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
    const { name, pin } = body as { name?: string; pin?: string };

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "请输入课堂名称" }, { status: 400 });
    }
    if (!pin || pin.length < 4) {
      return NextResponse.json({ error: "PIN 至少4位" }, { status: 400 });
    }

    // Create new session
    const newCode = generateSessionCode();
    const teacherPin = hashSync(pin, 10);

    const [newSession] = await db
      .insert(sessions)
      .values({ code: newCode, name: name.trim(), teacherPin })
      .returning({ id: sessions.id, code: sessions.code, name: sessions.name });

    // Copy students from original session
    const roster = await db
      .select({ studentId: students.studentId, name: students.name, email: students.email })
      .from(students)
      .where(eq(students.sessionId, auth.sessionId));

    if (roster.length > 0) {
      await db.insert(students).values(
        roster.map((s) => ({
          sessionId: newSession.id,
          studentId: s.studentId,
          name: s.name,
          email: s.email,
        }))
      );
    }

    // Set auth cookie for the new session so teacher can access it directly
    const token = await signToken({ sessionId: newSession.id, code: newSession.code });
    await setAuthCookie(newSession.code, token);

    return NextResponse.json(
      { ...newSession, studentsCloned: roster.length },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "克隆失败" }, { status: 500 });
  }
}
