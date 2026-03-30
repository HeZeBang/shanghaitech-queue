"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface Student {
  id: string;
  studentId: string;
  name: string;
  email: string | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function RosterTable({
  code,
  onQueueChange,
}: {
  code: string;
  onQueueChange?: () => void;
}) {
  const { data, isLoading, mutate } = useSWR<Student[]>(
    `/api/sessions/${code}/students`,
    fetcher
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", studentId: "" });
  const [loading, setLoading] = useState<string | null>(null);

  function startEdit(student: Student) {
    setEditingId(student.id);
    setEditForm({
      name: student.name,
      email: student.email || "",
      studentId: student.studentId,
    });
  }

  async function saveEdit(id: string) {
    setLoading(id);
    try {
      const res = await fetch(`/api/sessions/${code}/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          studentId: editForm.studentId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "保存失败");
        return;
      }
      toast.success("已保存");
      setEditingId(null);
      mutate();
    } catch {
      toast.error("网络错误");
    } finally {
      setLoading(null);
    }
  }

  async function deleteStudent(id: string) {
    if (!confirm("确定删除该学生？")) return;
    setLoading(id);
    try {
      const res = await fetch(`/api/sessions/${code}/students/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("删除失败");
        return;
      }
      toast.success("已删除");
      mutate();
    } catch {
      toast.error("网络错误");
    } finally {
      setLoading(null);
    }
  }

  async function handleAction(studentDbId: string, action: "checking" | "done" | "absent") {
    setLoading(studentDbId);
    try {
      const res = await fetch(`/api/sessions/${code}/students/${studentDbId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "操作失败");
        return;
      }
      const labels = { checking: "开始检查", done: "已完成", absent: "标记缺席" };
      toast.success(labels[action]);
      onQueueChange?.();
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
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        暂无学生名单，请点击&quot;导入名单&quot;添加
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>学号</TableHead>
            <TableHead>姓名</TableHead>
            <TableHead>邮箱</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((student) => (
            <TableRow key={student.id}>
              {editingId === student.id ? (
                <>
                  <TableCell>
                    <Input
                      value={editForm.studentId}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, studentId: e.target.value }))
                      }
                      className="h-8 font-mono"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, name: e.target.value }))
                      }
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, email: e.target.value }))
                      }
                      className="h-8"
                      placeholder="-"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="sm"
                        disabled={loading === student.id}
                        onClick={() => saveEdit(student.id)}
                      >
                        保存
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(null)}
                      >
                        取消
                      </Button>
                    </div>
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell className="font-mono">{student.studentId}</TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {student.email || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end flex-wrap">
                      <Button
                        size="sm"
                        variant="default"
                        disabled={loading === student.id}
                        onClick={() => handleAction(student.id, "checking")}
                      >
                        检查
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={loading === student.id}
                        onClick={() => handleAction(student.id, "done")}
                      >
                        完成
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={loading === student.id}
                        onClick={() => handleAction(student.id, "absent")}
                      >
                        缺席
                      </Button>
                      <div className="mx-1 w-px h-6 bg-muted" />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={loading === student.id}
                        onClick={() => startEdit(student)}
                      >
                        编辑信息
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={loading === student.id}
                        onClick={() => deleteStudent(student.id)}
                      >
                        删除学生
                      </Button>
                    </div>
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
