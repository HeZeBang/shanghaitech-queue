"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SessionCodeInput } from "@/components/session-code-input";
import { toast } from "sonner";

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("请输入课堂名称");
      return;
    }
    if (!pin || pin.length < 4) {
      toast.error("PIN 至少4位数字");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "创建失败");
        return;
      }
      toast.success(`课堂创建成功！代码：${data.code}`);
      router.push(`/${data.code}/teacher/login`);
    } catch {
      toast.error("网络错误");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">课堂排队系统</h1>
          <p className="text-muted-foreground">
            ShanghaiTech Queue — 轻量课堂排队管理
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>加入课堂</CardTitle>
            <CardDescription>输入课堂代码加入排队</CardDescription>
          </CardHeader>
          <CardContent>
            <SessionCodeInput />
          </CardContent>
        </Card>

        <div className="relative">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
            或
          </span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>创建新课堂</CardTitle>
            <CardDescription>教师创建课堂并获取代码</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">课堂名称</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="如：数据结构 Lab5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin">教师 PIN（至少4位数字）</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="如：1234"
                  maxLength={16}
                />
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? "创建中..." : "创建课堂"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
