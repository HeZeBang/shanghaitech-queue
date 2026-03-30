"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { NotifyPref } from "@/hooks/use-notifications";

const prefOptions: { key: NotifyPref; label: string; description: string }[] = [
  {
    key: "my-turn",
    label: "轮到我时提醒",
    description: "前方无人等待时发送通知",
  },
  {
    key: "few-ahead",
    label: "队列畅通时提醒",
    description: "前方少于3人时发送通知",
  },
];

export function NotificationPrefs({
  supported,
  permission,
  prefs,
  onToggle,
}: {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  prefs: Set<NotifyPref>;
  onToggle: (pref: NotifyPref) => void;
}) {
  if (!supported) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>通知提醒</span>
          {permission === "denied" && (
            <span className="text-xs text-destructive font-normal">
              浏览器已拒绝通知权限
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {permission === "denied" && (
          <p className="text-xs text-muted-foreground">
            请在浏览器设置中允许本网站发送通知后刷新页面。
          </p>
        )}
        {prefOptions.map((opt) => (
          <Button
            key={opt.key}
            variant={prefs.has(opt.key) ? "default" : "outline"}
            size="sm"
            className="w-full justify-start h-auto py-2"
            disabled={permission === "denied"}
            onClick={() => onToggle(opt.key)}
          >
            <div className="text-left">
              <div className="text-sm">{prefs.has(opt.key) ? "✓ " : ""}{opt.label}</div>
              <div className={`text-xs ${prefs.has(opt.key) ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {opt.description}
              </div>
            </div>
          </Button>
        ))}
        <p className="text-xs text-muted-foreground pt-1">
          部分浏览器（如 iOS Safari）可能不支持网页通知。开启后请勿关闭此页面。
        </p>
      </CardContent>
    </Card>
  );
}
