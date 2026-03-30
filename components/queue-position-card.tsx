"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { QueueEntry, QueueStats } from "@/hooks/use-queue-polling";

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

function formatTime(seconds: number): string {
  if (seconds < 60) return `约 ${seconds} 秒`;
  const mins = Math.floor(seconds / 60);
  return `约 ${mins} 分钟`;
}

export function QueuePositionCard({
  entry,
  queue,
  stats,
}: {
  entry: QueueEntry;
  queue: QueueEntry[];
  stats?: QueueStats;
}) {
  const aheadCount = queue.filter(
    (e) => e.status === "waiting" && e.position < entry.position
  ).length;

  const personalWait =
    stats && stats.avgCheckSeconds > 0
      ? Math.round(
          (aheadCount * stats.avgCheckSeconds) / Math.max(stats.checking, 1)
        )
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>我的排队状态</span>
          <Badge variant={statusVariants[entry.status]}>
            {statusLabels[entry.status]}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">排队序号</span>
          <span className="font-mono font-bold text-lg">#{entry.position}</span>
        </div>
        {entry.status === "waiting" && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">前方等待人数</span>
              <span className="font-bold">{aheadCount} 人</span>
            </div>
            {personalWait !== null && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">预估等待时间</span>
                <span className="font-bold">{formatTime(personalWait)}</span>
              </div>
            )}
          </>
        )}
        {entry.status === "checking" && (
          <p className="text-center text-blue-500 font-medium animate-pulse">
            正在检查中，请准备好...
          </p>
        )}
        {entry.status === "done" && (
          <p className="text-center text-green-500 font-medium">检查完成！</p>
        )}
      </CardContent>
    </Card>
  );
}
