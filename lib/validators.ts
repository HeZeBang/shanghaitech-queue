import { z } from "zod/v4";

export const createSessionSchema = z.object({
  name: z.string().min(1, "课堂名称不能为空").max(255),
  pin: z
    .string()
    .min(4, "PIN 至少4位")
    .max(16, "PIN 最多16位")
    .regex(/^\d+$/, "PIN 只能包含数字"),
});

export const authSchema = z.object({
  pin: z.string().min(1, "请输入 PIN"),
});

export const joinQueueSchema = z.object({
  studentId: z.string().min(1, "请输入学号").max(64),
});

export const updateQueueSchema = z.object({
  status: z.enum(["checking", "done", "absent"]),
  notes: z.string().max(500).optional(),
});

export const cancelQueueSchema = z.object({
  entryId: z.string().uuid("无效的排队记录 ID"),
  studentId: z.string().min(1, "请输入学号").max(64),
});

export const importStudentsSchema = z.object({
  students: z
    .array(
      z.object({
        studentId: z.string().min(1).max(64),
        name: z.string().min(1).max(255),
        email: z.string().email().max(255).optional(),
      })
    )
    .min(1, "至少导入一名学生"),
});
