import { NextResponse } from "next/server";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireTeacher } from "@/lib/auth";

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
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const auth = await requireTeacher(code.toUpperCase());
  if (!auth) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  await db
    .update(sessions)
    .set({ status: "closed" })
    .where(eq(sessions.code, code.toUpperCase()));

  return NextResponse.json({ success: true });
}
