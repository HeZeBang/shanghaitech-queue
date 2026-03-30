"use client";

import useSWR from "swr";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface Student {
  id: string;
  studentId: string;
  name: string;
  email: string | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function RosterTable({ code }: { code: string }) {
  const { data, isLoading } = useSWR<Student[]>(
    `/api/sessions/${code}/students`,
    fetcher
  );

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
        暂无学生名单，请点击"导入名单"添加
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((student) => (
            <TableRow key={student.id}>
              <TableCell className="font-mono">{student.studentId}</TableCell>
              <TableCell>{student.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {student.email || "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
