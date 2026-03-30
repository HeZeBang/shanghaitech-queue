import { NextResponse } from "next/server";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { createSessionSchema } from "@/lib/validators";
import { generateSessionCode } from "@/lib/session-code";
import { hashSync } from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, pin } = parsed.data;
    const code = generateSessionCode();
    const teacherPin = hashSync(pin, 10);

    const [session] = await db
      .insert(sessions)
      .values({ code, name, teacherPin })
      .returning({ id: sessions.id, code: sessions.code, name: sessions.name });

    return NextResponse.json(session, { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建课堂失败" }, { status: 500 });
  }
}
