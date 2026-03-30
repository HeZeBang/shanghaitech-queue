"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { QueueEntry } from "@/hooks/use-queue-polling";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  waiting: "等待中",
  checking: "检查中",
  done: "已完成",
  absent: "缺席",
};

const statusVariants: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  waiting: "outline",
  checking: "default",
  done: "secondary",
  absent: "destructive",
};

export function StudentQueueList({
  queue,
  isLoading,
  code,
  onUpdate,
  on401,
}: {
  queue?: QueueEntry[];
  isLoading: boolean;
  code: string;
  onUpdate: () => void;
  on401?: () => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  async function updateStatus(
    id: string,
    status: "checking" | "done" | "absent"
  ) {
    setLoading(id);
    try {
      const res = await fetch(`/api/sessions/${code}/queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.status === 401) { on401?.(); return; }
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "操作失败");
        return;
      }
      onUpdate();
    } catch {
      toast.error("网络错误");
    } finally {
      setLoading(null);
    }
  }

  async function removeEntry(id: string) {
    setLoading(id);
    try {
      const res = await fetch(`/api/sessions/${code}/queue/${id}`, {
        method: "DELETE",
      });
      if (res.status === 401) { on401?.(); return; }
      if (!res.ok) {
        toast.error("移除失败");
        return;
      }
      onUpdate();
    } catch {
      toast.error("网络错误");
    } finally {
      setLoading(null);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!queue || queue.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">暂无排队记录</p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">#</TableHead>
            <TableHead>学号</TableHead>
            <TableHead>姓名</TableHead>
            <TableHead>状态</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {queue.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="font-mono">{entry.position}</TableCell>
              <TableCell className="font-mono">{entry.studentId}</TableCell>
              <TableCell>{entry.studentName}</TableCell>
              <TableCell>
                <Badge variant={statusVariants[entry.status]}>
                  {statusLabels[entry.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex gap-1 justify-end">
                  {entry.status === "waiting" && (
                    <Button
                      size="sm"
                      variant="default"
                      disabled={loading === entry.id}
                      onClick={() => updateStatus(entry.id, "checking")}
                    >
                      开始检查
                    </Button>
                  )}
                  {entry.status === "checking" && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        disabled={loading === entry.id}
                        onClick={() => updateStatus(entry.id, "done")}
                      >
                        完成
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={loading === entry.id}
                        onClick={() => updateStatus(entry.id, "absent")}
                      >
                        缺席
                      </Button>
                    </>
                  )}
                  {(
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={loading === entry.id}
                      onClick={() => removeEntry(entry.id)}
                    >
                      移除记录
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
