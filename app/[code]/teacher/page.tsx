"use client";

import { use } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/hooks/use-session";
import { useQueuePolling, useStatsPolling } from "@/hooks/use-queue-polling";
import { QueueStatusCard } from "@/components/queue-status-card";
import { StudentQueueList } from "@/components/student-queue-list";
import { RosterTable } from "@/components/roster-table";
import { RosterImportDialog } from "@/components/roster-import-dialog";
import { toast } from "sonner";

export default function TeacherDashboard({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const { session, isLoading: sessionLoading, mutate: mutateSession } = useSession(code);
  const { queue, isLoading: queueLoading, mutate: mutateQueue } = useQueuePolling(code);
  const { stats, isLoading: statsLoading } = useStatsPolling(code);

  async function handleCloseSession() {
    if (!confirm("确定要关闭课堂吗？关闭后学生将无法加入排队。")) return;

    try {
      const res = await fetch(`/api/sessions/${code}`, { method: "PATCH" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "关闭失败");
        return;
      }
      toast.success("课堂已关闭");
      mutateSession();
    } catch {
      toast.error("网络错误");
    }
  }

  function handleExport() {
    window.open(`/api/sessions/${code}/export`, "_blank");
  }

  if (sessionLoading) {
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!session || ("error" in session)) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center space-y-4">
          <p>课堂不存在或未授权</p>
          <Link href="/">
            <Button variant="outline">返回首页</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{session.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-sm text-muted-foreground">
              课堂代码：{session.code}
            </span>
            <Badge
              variant={session.status === "active" ? "default" : "secondary"}
            >
              {session.status === "active" ? "进行中" : "已关闭"}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            导出 CSV
          </Button>
          {session.status === "active" && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCloseSession}
            >
              关闭课堂
            </Button>
          )}
        </div>
      </div>

      <QueueStatusCard stats={stats} isLoading={statsLoading} />

      <Separator />

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">
            队列管理
            {stats && stats.waiting + stats.checking > 0 && (
              <Badge variant="secondary" className="ml-2">
                {stats.waiting + stats.checking}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="roster">学生名单</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-4">
          <StudentQueueList
            queue={queue}
            isLoading={queueLoading}
            code={code}
            onUpdate={() => mutateQueue()}
          />
        </TabsContent>

        <TabsContent value="roster" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <RosterImportDialog code={code} onImported={() => mutateQueue()} />
          </div>
          <RosterTable code={code} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
