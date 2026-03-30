import { NextResponse } from "next/server";
import { db } from "@/db";
import { queueEntries, sessions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

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

  const stats = await db
    .select({
      waiting: sql<number>`COUNT(*) FILTER (WHERE ${queueEntries.status} = 'waiting')`,
      checking: sql<number>`COUNT(*) FILTER (WHERE ${queueEntries.status} = 'checking')`,
      done: sql<number>`COUNT(*) FILTER (WHERE ${queueEntries.status} = 'done')`,
      absent: sql<number>`COUNT(*) FILTER (WHERE ${queueEntries.status} = 'absent')`,
      total: sql<number>`COUNT(*)`,
      avgCheckSeconds: sql<number>`COALESCE(
        AVG(EXTRACT(EPOCH FROM (${queueEntries.checkEndedAt} - ${queueEntries.checkStartedAt})))
        FILTER (WHERE ${queueEntries.status} = 'done' AND ${queueEntries.checkStartedAt} IS NOT NULL AND ${queueEntries.checkEndedAt} IS NOT NULL),
        0
      )`,
    })
    .from(queueEntries)
    .where(eq(queueEntries.sessionId, session[0].id));

  const s = stats[0];
  const waiting = Number(s.waiting);
  const checking = Number(s.checking);
  const avgCheckSeconds = Math.round(Number(s.avgCheckSeconds));
  const estimatedWaitSeconds =
    checking > 0
      ? Math.round((waiting * avgCheckSeconds) / checking)
      : waiting * avgCheckSeconds;

  return NextResponse.json({
    waiting,
    checking,
    done: Number(s.done),
    absent: Number(s.absent),
    total: Number(s.total),
    avgCheckSeconds,
    estimatedWaitSeconds,
  });
}
