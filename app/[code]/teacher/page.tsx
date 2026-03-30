"use client";

import { useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  const router = useRouter();
  const { session, isLoading: sessionLoading, mutate: mutateSession } = useSession(code);
  const { queue, isLoading: queueLoading, mutate: mutateQueue } = useQueuePolling(code);
  const { stats, isLoading: statsLoading } = useStatsPolling(code);

  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const [clonePin, setClonePin] = useState("");
  const [cloning, setCloning] = useState(false);

  const handle401 = useCallback(
    (res: Response) => {
      if (res.status === 401) {
        toast.error("登录已过期，请重新登录");
        router.push(`/${code}/teacher/login`);
        return true;
      }
      return false;
    },
    [code, router]
  );

  async function handleCloseSession() {
    if (!confirm("确定要关闭课堂吗？关闭后学生将无法加入排队。")) return;

    try {
      const res = await fetch(`/api/sessions/${code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close" }),
      });
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

  async function handleReopenSession() {
    if (!confirm("重新开放将清空所有队列记录，确定继续吗？")) return;

    try {
      const res = await fetch(`/api/sessions/${code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reopen" }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "开放失败");
        return;
      }
      toast.success("课堂已重新开放");
      mutateSession();
      mutateQueue();
    } catch {
      toast.error("网络错误");
    }
  }

  async function handleClone(e: React.FormEvent) {
    e.preventDefault();
    if (!cloneName.trim()) {
      toast.error("请输入新课堂名称");
      return;
    }
    if (!clonePin || clonePin.length < 4) {
      toast.error("PIN 至少4位数字");
      return;
    }

    setCloning(true);
    try {
      const res = await fetch(`/api/sessions/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cloneName.trim(), pin: clonePin }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "克隆失败");
        return;
      }
      toast.success(`已克隆 ${data.studentsCloned} 名学生到新课堂 ${data.code}`);
      setCloneOpen(false);
      router.push(`/${data.code}/teacher`);
    } catch {
      toast.error("网络错误");
    } finally {
      setCloning(false);
    }
  }

  async function handleClearQueue() {
    if (!confirm("确定清空所有队列记录？此操作不可恢复。")) return;
    try {
      const res = await fetch(`/api/sessions/${code}/queue`, { method: "DELETE" });
      if (handle401(res)) return;
      if (!res.ok) {
        toast.error("清空失败");
        return;
      }
      toast.success("队列已清空");
      mutateQueue();
    } catch {
      toast.error("网络错误");
    }
  }

  async function handleClearRoster() {
    if (!confirm("确定清空所有学生名单？关联的队列记录也会被删除。此操作不可恢复。")) return;
    try {
      const res = await fetch(`/api/sessions/${code}/students`, { method: "DELETE" });
      if (handle401(res)) return;
      if (!res.ok) {
        toast.error("清空失败");
        return;
      }
      toast.success("名单已清空");
      mutateQueue();
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
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm" onClick={handleExport}>
            导出 CSV
          </Button>

          <Dialog
            open={cloneOpen}
            onOpenChange={(v) => {
              setCloneOpen(v);
              if (!v) { setCloneName(""); setClonePin(""); }
            }}
          >
            <DialogTrigger render={<Button variant="outline" size="sm" />}>
              克隆课堂
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>克隆课堂</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                将当前学生名单复制到新课堂，队列记录不会复制。
              </p>
              <form onSubmit={handleClone} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="clone-name">新课堂名称</Label>
                  <Input
                    id="clone-name"
                    value={cloneName}
                    onChange={(e) => setCloneName(e.target.value)}
                    placeholder={`如：${session.name} (2)`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clone-pin">新课堂 PIN</Label>
                  <Input
                    id="clone-pin"
                    type="password"
                    inputMode="numeric"
                    value={clonePin}
                    onChange={(e) => setClonePin(e.target.value.replace(/\D/g, ""))}
                    placeholder="至少4位数字"
                    maxLength={16}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={cloning}>
                  {cloning ? "克隆中..." : "创建并克隆名单"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {session.status === "active" ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCloseSession}
            >
              关闭课堂
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handleReopenSession}
            >
              重新开放
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

        <TabsContent value="queue" className="mt-4 space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => mutateQueue()}>
              刷新
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearQueue}
              disabled={!queue || queue.length === 0}
            >
              清空队列
            </Button>
          </div>
          <StudentQueueList
            queue={queue}
            isLoading={queueLoading}
            code={code}
            onUpdate={() => mutateQueue()}
            on401={() => { toast.error("登录已过期，请重新登录"); router.push(`/${code}/teacher/login`); }}
          />
        </TabsContent>

        <TabsContent value="roster" className="mt-4 space-y-4">
          <div className="flex justify-end gap-2">
            <RosterImportDialog code={code} onImported={() => mutateQueue()} />
            <Button variant="outline" size="sm" onClick={() => mutateQueue()}>
              刷新
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearRoster}
            >
              清空名单
            </Button>
          </div>
          <RosterTable code={code} onQueueChange={() => mutateQueue()} on401={() => { toast.error("登录已过期，请重新登录"); router.push(`/${code}/teacher/login`); }} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
