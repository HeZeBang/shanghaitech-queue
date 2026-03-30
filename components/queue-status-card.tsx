"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { QueueStats } from "@/hooks/use-queue-polling";

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds} 秒`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins} 分 ${secs} 秒` : `${mins} 分钟`;
}

export function QueueStatusCard({
  stats,
  isLoading,
}: {
  stats?: QueueStats;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-16" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const items = [
    { label: "等待中", value: stats.waiting, color: "text-yellow-500" },
    { label: "检查中", value: stats.checking, color: "text-blue-500" },
    { label: "已完成", value: stats.done, color: "text-green-500" },
    {
      label: "预估等待",
      value: formatTime(stats.estimatedWaitSeconds),
      color: "text-muted-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {item.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
