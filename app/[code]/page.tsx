"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/use-session";
import { useQueuePolling, useStatsPolling } from "@/hooks/use-queue-polling";
import { useNotifications } from "@/hooks/use-notifications";
import { QueueStatusCard } from "@/components/queue-status-card";
import { QueuePositionCard } from "@/components/queue-position-card";
import { NotificationPrefs } from "@/components/notification-prefs";
import { toast } from "sonner";

export default function StudentPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const { session, isLoading: sessionLoading } = useSession(code);
  const { queue, isLoading: queueLoading, mutate } = useQueuePolling(code);
  const { stats, isLoading: statsLoading } = useStatsPolling(code);
  const {
    supported,
    permission,
    prefs,
    togglePref,
    notify,
    resetNotified,
  } = useNotifications(code);

  const [studentId, setStudentId] = useState("");
  const [joining, setJoining] = useState(false);
  const [entryId, setEntryId] = useState<string | null>(null);

  // Track previous ahead count to detect transitions
  const prevAheadRef = useRef<number | null>(null);
  const prevStatusRef = useRef<string | null>(null);

  // Restore entryId from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`queue_entry_${code}`);
    if (saved) setEntryId(saved);
  }, [code]);

  const myEntry = queue?.find((e) => e.id === entryId);

  // Notification trigger logic
  useEffect(() => {
    if (!myEntry || myEntry.status !== "waiting" || !queue) return;

    const aheadCount = queue.filter(
      (e) => e.status === "waiting" && e.position < myEntry.position
    ).length;

    // Only notify on transitions (not on first load)
    if (prevAheadRef.current !== null) {
      if (prefs.has("my-turn") && aheadCount === 0 && prevAheadRef.current > 0) {
        notify("my-turn", "轮到你了！", "前方已无人等待，请准备检查");
      }

      if (
        prefs.has("few-ahead") &&
        aheadCount > 0 &&
        aheadCount <= 3 &&
        prevAheadRef.current > 3
      ) {
        notify("few-ahead", "队列畅通", `前方仅 ${aheadCount} 人，请提前准备`);
      }
    }

    prevAheadRef.current = aheadCount;
  }, [myEntry, queue, prefs, notify]);

  // Notify on status change to "checking"
  useEffect(() => {
    if (!myEntry) return;

    if (
      prevStatusRef.current === "waiting" &&
      myEntry.status === "checking"
    ) {
      notify("checking", "开始检查", "老师正在检查你的内容，请注意");
    }

    prevStatusRef.current = myEntry.status;
  }, [myEntry, notify]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId.trim()) {
      toast.error("请输入学号");
      return;
    }

    setJoining(true);
    try {
      const res = await fetch(`/api/sessions/${code}/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: studentId.trim() }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setEntryId(data.entry.id);
        localStorage.setItem(`queue_entry_${code}`, data.entry.id);
        toast.info("你已在队列中");
        mutate();
        return;
      }
      if (!res.ok) {
        toast.error(data.error || "加入排队失败");
        return;
      }
      setEntryId(data.id);
      localStorage.setItem(`queue_entry_${code}`, data.id);
      resetNotified();
      toast.success(`已加入排队，序号 #${data.position}`);
      mutate();
    } catch {
      toast.error("网络错误");
    } finally {
      setJoining(false);
    }
  }

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!session || ("error" in session)) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-lg">课堂不存在</p>
            <Link href="/">
              <Button variant="outline">返回首页</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">{session.name}</h1>
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">
              {session.code}
            </span>
            <Badge variant={session.status === "active" ? "default" : "secondary"}>
              {session.status === "active" ? "进行中" : "已关闭"}
            </Badge>
          </div>
        </div>

        <QueueStatusCard stats={stats} isLoading={statsLoading} />

        {myEntry ? (
          <>
            <QueuePositionCard entry={myEntry} queue={queue || []} stats={stats} />
            {myEntry.status === "waiting" && (
              <NotificationPrefs
                supported={supported}
                permission={permission}
                prefs={prefs}
                onToggle={togglePref}
              />
            )}
          </>
        ) : (
          session.status === "active" && (
            <Card>
              <CardHeader>
                <CardTitle>加入排队</CardTitle>
                <CardDescription>输入学号加入检查队列</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleJoin} className="flex gap-2">
                  <Input
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="输入学号"
                    className="font-mono"
                  />
                  <Button type="submit" disabled={joining}>
                    {joining ? "加入中..." : "排队"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )
        )}

        {session.status === "closed" && !myEntry && (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">课堂已关闭，无法加入排队</p>
            </CardContent>
          </Card>
        )}

        <Separator />

        <div className="text-center">
          <Link
            href={`/${code}/teacher/login`}
            className="text-sm text-muted-foreground hover:underline"
          >
            教师入口
          </Link>
        </div>
      </div>
    </div>
  );
}
