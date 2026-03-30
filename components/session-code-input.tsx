"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SessionCodeInput() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError("请输入课堂代码");
      return;
    }
    if (trimmed.length !== 6) {
      setError("课堂代码为6位");
      return;
    }
    setError("");
    router.push(`/${trimmed}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={code}
        onChange={(e) => {
          setCode(e.target.value.toUpperCase());
          setError("");
        }}
        placeholder="输入6位课堂代码"
        maxLength={6}
        className="font-mono text-center text-lg tracking-widest uppercase"
      />
      <Button type="submit">加入</Button>
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </form>
  );
}
