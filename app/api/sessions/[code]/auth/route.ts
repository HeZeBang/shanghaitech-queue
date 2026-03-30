import { NextResponse } from "next/server";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { compareSync } from "bcryptjs";
import { signToken, setAuthCookie } from "@/lib/auth";
import { authSchema } from "@/lib/validators";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const parsed = authSchema.safeParse(body);

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

    const valid = compareSync(parsed.data.pin, session[0].teacherPin);
    if (!valid) {
      return NextResponse.json({ error: "PIN 错误" }, { status: 401 });
    }

    const token = await signToken({
      sessionId: session[0].id,
      code: session[0].code,
    });

    await setAuthCookie(session[0].code, token);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}
