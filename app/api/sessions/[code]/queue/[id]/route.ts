import { NextResponse } from "next/server";
import { db } from "@/db";
import { queueEntries } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireTeacher } from "@/lib/auth";
import { updateQueueSchema } from "@/lib/validators";

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
  const parsed = updateQueueSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { status, notes } = parsed.data;

  const updateData: Record<string, unknown> = { status };

  if (status === "checking") {
    updateData.checkStartedAt = new Date();
  } else if (status === "done" || status === "absent") {
    updateData.checkEndedAt = new Date();
  }

  if (notes !== undefined) {
    updateData.notes = notes;
  }

  const [updated] = await db
    .update(queueEntries)
    .set(updateData)
    .where(eq(queueEntries.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
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

  await db.delete(queueEntries).where(eq(queueEntries.id, id));

  return NextResponse.json({ success: true });
}
