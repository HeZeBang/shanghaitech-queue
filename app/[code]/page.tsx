"use client";

import { useState, useEffect, use } from "react";
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
import { QueueStatusCard } from "@/components/queue-status-card";
import { QueuePositionCard } from "@/components/queue-position-card";
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

  const [studentId, setStudentId] = useState("");
  const [joining, setJoining] = useState(false);
  const [entryId, setEntryId] = useState<string | null>(null);

  // Restore entryId from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`queue_entry_${code}`);
    if (saved) setEntryId(saved);
  }, [code]);

  const myEntry = queue?.find((e) => e.id === entryId);

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
        // Already in queue
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
          <QueuePositionCard entry={myEntry} queue={queue || []} stats={stats} />
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
