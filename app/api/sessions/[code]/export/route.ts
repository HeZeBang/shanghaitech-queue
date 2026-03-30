import { NextResponse } from "next/server";
import { db } from "@/db";
import { queueEntries, students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireTeacher } from "@/lib/auth";
import { generateExportCSV } from "@/lib/csv";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const auth = await requireTeacher(code.toUpperCase());
  if (!auth) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const entries = await db
    .select({
      studentId: students.studentId,
      name: students.name,
      status: queueEntries.status,
      joinedAt: queueEntries.joinedAt,
      checkStartedAt: queueEntries.checkStartedAt,
      checkEndedAt: queueEntries.checkEndedAt,
      notes: queueEntries.notes,
    })
    .from(queueEntries)
    .innerJoin(students, eq(queueEntries.studentId, students.id))
    .where(eq(queueEntries.sessionId, auth.sessionId))
    .orderBy(queueEntries.position);

  const data = entries.map((e) => {
    const durationSeconds =
      e.checkStartedAt && e.checkEndedAt
        ? Math.round(
            (e.checkEndedAt.getTime() - e.checkStartedAt.getTime()) / 1000
          )
        : null;

    return {
      studentId: e.studentId,
      name: e.name,
      status: e.status,
      joinedAt: e.joinedAt.toISOString(),
      checkStartedAt: e.checkStartedAt?.toISOString() ?? null,
      checkEndedAt: e.checkEndedAt?.toISOString() ?? null,
      durationSeconds,
      notes: e.notes,
    };
  });

  const csv = generateExportCSV(data);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="queue-export-${code}.csv"`,
    },
  });
}
