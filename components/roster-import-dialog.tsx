"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseStudentCSV, type StudentRow } from "@/lib/csv";
import { toast } from "sonner";

export function RosterImportDialog({
  code,
  onImported,
}: {
  code: string;
  onImported: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<StudentRow[]>([]);
  const [step, setStep] = useState<"input" | "preview">("input");
  const [loading, setLoading] = useState(false);

  function handleParse() {
    const rows = parseStudentCSV(text);
    if (rows.length === 0) {
      toast.error("未解析到有效数据");
      return;
    }
    setPreview(rows);
    setStep("preview");
  }

  async function handleImport() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${code}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: preview }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "导入失败");
        return;
      }
      toast.success(`导入成功：新增 ${data.imported} 人，更新 ${data.updated} 人`);
      setOpen(false);
      setText("");
      setPreview([]);
      setStep("input");
      onImported();
    } catch {
      toast.error("网络错误");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (!v) {
      setText("");
      setPreview([]);
      setStep("input");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" />}>
        导入名单
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>导入学生名单</DialogTitle>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              支持格式：每行一个学号，或 CSV 格式（学号,姓名,邮箱）
            </p>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"2024001,张三,zhangsan@mail.com\n2024002,李四\n2024003"}
              rows={8}
              className="font-mono text-sm"
            />
            <Button onClick={handleParse} disabled={!text.trim()}>
              解析预览
            </Button>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              共解析 {preview.length} 条记录，请确认后导入
            </p>
            <div className="max-h-60 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>学号</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>邮箱</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono">
                        {row.studentId}
                      </TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.email || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep("input")}
                disabled={loading}
              >
                返回修改
              </Button>
              <Button onClick={handleImport} disabled={loading}>
                {loading ? "导入中..." : "确认导入"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
