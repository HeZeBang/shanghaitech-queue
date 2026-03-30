"use client";

import { use } from "react";
import { useQueuePolling, useStatsPolling } from "@/hooks/use-queue-polling";
import { useSession } from "@/hooks/use-session";
import { Badge } from "@/components/ui/badge";

function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return "--";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m${secs}s` : `${mins}m`;
}

function formatClock() {
  return new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DisplayPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const { session } = useSession(code);
  const { queue } = useQueuePolling(code);
  const { stats } = useStatsPolling(code);

  const checking = queue?.filter((e) => e.status === "checking") ?? [];
  const waiting = queue?.filter((e) => e.status === "waiting") ?? [];
  const done = queue?.filter((e) => e.status === "done") ?? [];

  return (
    <div className="min-h-screen bg-black text-white p-6 lg:p-10 flex flex-col select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 lg:mb-10">
        <div>
          <h1 className="text-3xl lg:text-5xl font-bold tracking-tight">
            {session?.name ?? "加载中..."}
          </h1>
          <p className="text-lg lg:text-2xl text-zinc-500 font-mono mt-1">
            {session?.code}
          </p>
        </div>
        <div className="text-right">
          <p className="text-4xl lg:text-6xl font-mono font-bold text-zinc-400">
            {formatClock()}
          </p>
          <Badge
            variant={session?.status === "active" ? "default" : "secondary"}
            className="mt-2 text-sm"
          >
            {session?.status === "active" ? "进行中" : "已关闭"}
          </Badge>
        </div>
      </div>

      {/* Main content — landscape optimized with side-by-side layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6 lg:gap-10 min-h-0">
        {/* Left: Stats */}
        <div className="flex flex-col gap-4 lg:gap-6">
          {/* Currently checking */}
          <div className="rounded-2xl bg-blue-500/10 border border-blue-500/30 p-6 lg:p-8 flex-1">
            <p className="text-sm lg:text-base text-blue-400 uppercase tracking-widest mb-3">
              正在检查
            </p>
            {checking.length > 0 ? (
              <div className="space-y-3">
                {checking.map((entry) => (
                  <div key={entry.id} className="flex items-baseline gap-3">
                    <span className="text-3xl lg:text-5xl font-bold text-blue-400">
                      #{entry.position}
                    </span>
                    <span className="text-xl lg:text-3xl font-medium truncate">
                      {entry.studentName}
                    </span>
                    <span className="text-lg lg:text-xl text-zinc-500 font-mono">
                      {entry.studentId}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-2xl lg:text-4xl text-zinc-600">暂无</p>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3 lg:gap-4">
            <StatCard
              label="等待中"
              value={stats?.waiting ?? 0}
              color="text-yellow-400"
            />
            <StatCard
              label="已完成"
              value={done.length}
              color="text-green-400"
            />
            <StatCard
              label="平均用时"
              value={formatTime(stats?.avgCheckSeconds ?? 0)}
              color="text-zinc-300"
            />
          </div>
        </div>

        {/* Right: Waiting queue */}
        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-6 lg:p-8 overflow-hidden flex flex-col min-h-0">
          <p className="text-sm lg:text-base text-zinc-500 uppercase tracking-widest mb-4 lg:mb-6 shrink-0">
            排队列表
            {waiting.length > 0 && (
              <span className="ml-2 text-zinc-400">({waiting.length} 人)</span>
            )}
          </p>
          {waiting.length > 0 ? (
            <div className="flex-1 overflow-hidden">
              <div className="space-y-2 lg:space-y-3">
                {waiting.map((entry, i) => {
                  const personalWait =
                    stats && stats.avgCheckSeconds > 0
                      ? Math.round(
                          (i * stats.avgCheckSeconds) /
                            Math.max(stats.checking, 1)
                        )
                      : null;

                  return (
                    <div
                      key={entry.id}
                      className={`flex items-center gap-4 rounded-xl px-5 py-3 lg:px-6 lg:py-4 transition-colors ${
                        i === 0
                          ? "bg-green-500/10 border border-green-500/30"
                          : i <= 3
                            ? "bg-yellow-500/5 border border-yellow-500/20"
                            : "bg-zinc-800/50 border border-zinc-800"
                      }`}
                    >
                      <span
                        className={`text-2xl lg:text-3xl font-mono font-bold w-16 shrink-0 ${
                          i === 0
                            ? "text-green-400"
                            : i <= 3
                              ? "text-yellow-400"
                              : "text-zinc-500"
                        }`}
                      >
                        #{entry.position}
                      </span>
                      <span className="text-lg lg:text-2xl font-medium truncate flex-1">
                        {entry.studentName}
                      </span>
                      <span className="text-base lg:text-lg text-zinc-500 font-mono shrink-0">
                        {entry.studentId}
                      </span>
                      {personalWait !== null && personalWait > 0 && (
                        <span className="text-sm lg:text-base text-zinc-600 font-mono shrink-0">
                          ~{formatTime(personalWait)}
                        </span>
                      )}
                      {i === 0 && (
                        <Badge
                          variant="default"
                          className="bg-green-500/20 text-green-400 border-green-500/30 shrink-0"
                        >
                          下一位
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-2xl lg:text-3xl text-zinc-700">队列为空</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer — estimated wait */}
      {stats && stats.estimatedWaitSeconds > 0 && (
        <div className="mt-6 lg:mt-8 text-center">
          <p className="text-zinc-600 text-sm lg:text-base">
            预估最后一位等待时间：
            <span className="text-zinc-400 font-mono">
              {formatTime(stats.estimatedWaitSeconds)}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-4 lg:p-5 text-center">
      <p className="text-xs lg:text-sm text-zinc-600 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className={`text-2xl lg:text-4xl font-bold font-mono ${color}`}>
        {value}
      </p>
    </div>
  );
}
